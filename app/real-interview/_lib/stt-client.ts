// The realtime client keeps upstream diagnostics in the console and exposes
// short, actionable states to the interview UI. Reconnects reuse the current
// short-lived token so a brief network interruption cannot silently consume
// another transcription credit.

const LISTENING_UNAVAILABLE = "Listening is temporarily unavailable. Press Space to reconnect.";
const OUT_OF_CREDITS = "You have used your available credits. Choose a plan to continue.";
const IDLE_STOPPED =
  "Listening stopped after 3 minutes of silence, so your listening time is not spent on an empty room. Press Space to start again.";

// How long a silence runs before the microphone gives up. In a real interview
// somebody speaks every few seconds and even a long thinking pause is well
// under a minute, so this catches an empty room and never a person deciding
// what to say.
const IDLE_TIMEOUT_MS = 3 * 60_000;
const REPORT_INTERVAL_SECONDS = 60;

type StartOptions = {
  onStatus:        (s: string) => void;
  onPartial:       (text: string) => void;
  onFinal:         (text: string) => void;
  onError:         (err: string) => void;
  maxDelay?:       number;
  operatingPoint?: "enhanced" | "standard";
  authToken?:      string;
};

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch && ch.length > 0) this.port.postMessage(ch);
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);
`;

const MAX_RECONNECTS = 2;
const TOKEN_REUSE_WINDOW_MS = 100_000;

export class SpeechmaticsClient {
  private ws:          WebSocket | null        = null;
  private audioCtx:    AudioContext | null     = null;
  public  stream:      MediaStream | null      = null;
  private workletNode: AudioWorkletNode | null = null;
  private started = false;
  private options: StartOptions | null = null;
  private token = "";
  private tokenCreatedAt = 0;
  private reconnects = 0;
  private reconnectTimer: number | null = null;
  private stableTimer: number | null = null;
  private onlineHandler: (() => void) | null = null;

  // Listening time, the cost credits never saw. Speechmatics bills by the hour
  // of audio, so a microphone held open costs money whether or not anything is
  // asked. Measured here and reported as it goes, because a closed tab, a
  // crashed browser and a dropped connection all look the same afterwards and
  // all three would otherwise have listened for free.
  private meterTimer: number | null = null;
  private listeningSince = 0;
  private lastSpeechAt = 0;
  private unreportedSeconds = 0;

  async start(opts: StartOptions) {
    if (this.started) return;
    this.started = true;
    this.options = opts;
    this.reconnects = 0;

    try {
      opts.onStatus("Connecting securely…");
      const tokenHeaders: Record<string, string> = {};
      if (opts.authToken) tokenHeaders.Authorization = `Bearer ${opts.authToken}`;
      const tr = await fetch("/api/stt/tokens", {
        cache: "no-store",
        headers: tokenHeaders,
        signal: AbortSignal.timeout(15000),
      });
      if (!tr.ok) throw Object.assign(new Error("token_request_failed"), { status: tr.status });
      const data = await tr.json();
      if (!data.token) throw new Error("token_missing");

      this.token = data.token;
      this.tokenCreatedAt = Date.now();
      this.connect();
    } catch (err: any) {
      console.error("[Replysis] Could not start listening:", err?.status ?? err?.message ?? "Error");
      const message = err?.status === 402
        ? OUT_OF_CREDITS
        : err?.status === 401
          ? "Your sign-in expired. Refresh the page and sign in again."
          : LISTENING_UNAVAILABLE;
      this.fail(message);
    }
  }

  private connect() {
    const opts = this.options;
    if (!this.started || !opts || !this.token) return;

    opts.onStatus(this.reconnects ? `Reconnecting (${this.reconnects}/${MAX_RECONNECTS})…` : "Connecting securely…");
    const ws = new WebSocket(
      `wss://${process.env.NEXT_PUBLIC_SPEECHMATICS_RT_HOST ?? "eu.rt.speechmatics.com"}/v2?jwt=${this.token}`,
    );
    this.ws = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = async () => {
      if (!this.started || this.ws !== ws) return;
      opts.onStatus(this.reconnects ? "Connection restored. Starting microphone…" : "Starting microphone…");
      await this.setupAudio(opts);
      if (this.started) {
        // The clock starts when the microphone does, and a reconnect resumes
        // rather than restarting it, so a dropped connection cannot be used to
        // reset the idle timer for free.
        if (this.meterTimer === null) this.startMeter();
        else { this.listeningSince = Date.now(); this.lastSpeechAt = Date.now(); }
        this.clearStableTimer();
        this.stableTimer = window.setTimeout(() => { this.reconnects = 0; }, 8000);
      }
    };
    ws.onmessage = event => this.handleMessage(event, opts);
    ws.onerror = () => {
      console.error("[Replysis] Transcription socket error");
      try { ws.close(); } catch { this.handleDisconnect(1006); }
    };
    ws.onclose = event => {
      if (this.ws === ws) this.ws = null;
      if (!this.started) return;
      this.cleanupAudio();
      if (event.code === 1000) {
        console.warn("[Replysis] Transcription session ended normally");
        this.fail("Listening session ended. Press Space to reconnect.");
        return;
      }
      console.error(`[Replysis] Transcription socket closed unexpectedly code=${event.code}`);
      this.handleDisconnect(event.code);
    };
  }

  private handleDisconnect(_code: number) {
    const opts = this.options;
    if (!this.started || !opts) return;
    this.clearStableTimer();

    if (Date.now() - this.tokenCreatedAt >= TOKEN_REUSE_WINDOW_MS || this.reconnects >= MAX_RECONNECTS) {
      this.fail(LISTENING_UNAVAILABLE);
      return;
    }

    if (!navigator.onLine) {
      opts.onStatus("Connection lost — waiting for internet…");
      this.removeOnlineHandler();
      this.onlineHandler = () => {
        this.removeOnlineHandler();
        this.scheduleReconnect(300);
      };
      window.addEventListener("online", this.onlineHandler, { once: true });
      return;
    }

    this.scheduleReconnect(Math.min(2500, 600 * (this.reconnects + 1)));
  }

  private scheduleReconnect(delay: number) {
    if (!this.started || !this.options) return;
    if (Date.now() - this.tokenCreatedAt >= TOKEN_REUSE_WINDOW_MS || this.reconnects >= MAX_RECONNECTS) {
      this.fail(LISTENING_UNAVAILABLE);
      return;
    }
    this.reconnects += 1;
    this.options.onStatus(`Reconnecting (${this.reconnects}/${MAX_RECONNECTS})…`);
    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  private async setupAudio(opts: StartOptions) {
    try {
      this.cleanupAudio();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        } as MediaTrackConstraints,
      });

      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx({ latencyHint: "interactive", sampleRate: 16000 });
      await this.audioCtx.resume();

      this.ws?.send(JSON.stringify({
        message: "StartRecognition",
        audio_format: {
          type: "raw",
          encoding: "pcm_f32le",
          sample_rate: this.audioCtx.sampleRate,
        },
        transcription_config: {
          language: "en",
          operating_point: opts.operatingPoint || "enhanced",
          enable_partials: true,
          max_delay: opts.maxDelay ?? 0.3,
          enable_entities: true,
          additional_vocab: [
            { content: "Wipro", sounds_like: ["wee-pro"] },
            { content: "Renasant", sounds_like: ["ren-a-sant"] },
            { content: "PostgreSQL", sounds_like: ["post-gres"] },
            { content: "Spring Boot", sounds_like: ["spring boot"] },
            { content: "Kubernetes", sounds_like: ["koo-ber-neh-tees"] },
            { content: "Terraform", sounds_like: ["terra-form"] },
            { content: "Microservices", sounds_like: ["micro-services"] },
            { content: "GitOps", sounds_like: ["git-ops"] },
            { content: "CI/CD", sounds_like: ["c-i-c-d", "ci cd"] },
            { content: "Replysis", sounds_like: ["reply-sis"] },
            { content: "Roosevelt", sounds_like: ["roo-se-velt"] },
          ],
        },
      }));

      const source = this.audioCtx.createMediaStreamSource(this.stream);
      try {
        const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        try { await this.audioCtx.audioWorklet.addModule(blobUrl); }
        finally { URL.revokeObjectURL(blobUrl); }

        this.workletNode = new AudioWorkletNode(this.audioCtx, "pcm-processor");
        this.workletNode.port.onmessage = event => {
          if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(event.data.buffer);
        };
        source.connect(this.workletNode);
        this.workletNode.connect(this.audioCtx.destination);
        opts.onStatus(this.reconnects ? "Listening — connection restored" : "Listening…");
      } catch {
        const processor = this.audioCtx.createScriptProcessor(256, 1, 1);
        source.connect(processor);
        processor.connect(this.audioCtx.destination);
        processor.onaudioprocess = event => {
          if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(event.inputBuffer.getChannelData(0).buffer);
        };
        opts.onStatus(this.reconnects ? "Listening — connection restored" : "Listening (compatibility mode)…");
      }
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      console.error("[Replysis] Audio setup error:", name || "Error");
      this.fail(name === "NotAllowedError"
        ? "Microphone permission is blocked. Allow it in the browser, then press Space."
        : "No working microphone was found. Check your input, then press Space.");
    }
  }

  private handleMessage(event: MessageEvent, opts: StartOptions) {
    try {
      const message = JSON.parse(event.data as string);
      if (message.metadata?.transcript) this.lastSpeechAt = Date.now();
      if (message.message === "AddTranscript" && message.metadata?.transcript) {
        opts.onFinal(message.metadata.transcript);
      } else if (message.message === "AddPartialTranscript" && message.metadata?.transcript) {
        opts.onPartial(message.metadata.transcript);
      } else if (message.message === "Error") {
        const reason = String(message.reason ?? message.type ?? "");
        console.error(`[Replysis] Transcription error type=${message.type ?? "unknown"}`);
        this.fail(reason === "not_authorised"
          ? "Listening session expired. Press Space to reconnect."
          : LISTENING_UNAVAILABLE);
      }
    } catch {
      // Ignore non-JSON provider frames.
    }
  }

  private fail(message: string) {
    const onError = this.options?.onError;
    this.stop();
    onError?.(message);
  }

  private cleanupAudio() {
    try { this.workletNode?.disconnect(); } catch {}
    try { void this.audioCtx?.close(); } catch {}
    try { this.stream?.getTracks().forEach(track => track.stop()); } catch {}
    this.workletNode = null;
    this.audioCtx = null;
    this.stream = null;
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearStableTimer() {
    if (this.stableTimer !== null) window.clearTimeout(this.stableTimer);
    this.stableTimer = null;
  }

  private removeOnlineHandler() {
    if (this.onlineHandler) window.removeEventListener("online", this.onlineHandler);
    this.onlineHandler = null;
  }

  private startMeter() {
    this.listeningSince = Date.now();
    this.lastSpeechAt = Date.now();
    this.unreportedSeconds = 0;
    this.clearMeter();
    this.meterTimer = window.setInterval(() => this.meterTick(), 5_000);
  }

  private clearMeter() {
    if (this.meterTimer !== null) window.clearInterval(this.meterTimer);
    this.meterTimer = null;
  }

  private meterTick() {
    if (!this.started) { this.flushMeter(); return; }

    const now = Date.now();

    if (now - this.lastSpeechAt >= IDLE_TIMEOUT_MS) {
      // Stopping silently would be worse than the waste it prevents: someone
      // coming back would speak into a microphone they believed was on.
      const opts = this.options;
      this.stop();
      opts?.onStatus(IDLE_STOPPED);
      opts?.onError(IDLE_STOPPED);
      return;
    }

    if (this.listeningSince) {
      this.unreportedSeconds += (now - this.listeningSince) / 1000;
      this.listeningSince = now;
    }

    if (this.unreportedSeconds >= REPORT_INTERVAL_SECONDS) {
      const minutes = Math.floor(this.unreportedSeconds / 60);
      this.unreportedSeconds -= minutes * 60;
      void this.reportMinutes(minutes);
    }
  }

  /** Anything past half a minute still counts, so an interview of short turns is not free. */
  private flushMeter() {
    this.clearMeter();
    if (this.listeningSince) {
      this.unreportedSeconds += (Date.now() - this.listeningSince) / 1000;
      this.listeningSince = 0;
    }
    if (this.unreportedSeconds >= 30) {
      const minutes = Math.max(1, Math.round(this.unreportedSeconds / 60));
      this.unreportedSeconds = 0;
      void this.reportMinutes(minutes);
    }
  }

  private async reportMinutes(minutes: number) {
    if (minutes <= 0) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.options?.authToken) headers.Authorization = `Bearer ${this.options.authToken}`;
      // keepalive so the last minute still lands when the tab is closing.
      await fetch("/api/usage/listening", {
        method: "POST",
        headers,
        body: JSON.stringify({ minutes }),
        keepalive: true,
      });
    } catch {
      // Accounting must never interrupt an interview. The minute is lost, not the call.
    }
  }

  stop() {
    this.flushMeter();
    this.started = false;
    this.clearReconnectTimer();
    this.clearStableTimer();
    this.removeOnlineHandler();
    this.cleanupAudio();
    const ws = this.ws;
    this.ws = null;
    try { ws?.close(1000, "client_stop"); } catch {}
    this.options = null;
    this.token = "";
    this.tokenCreatedAt = 0;
    this.reconnects = 0;
  }
}

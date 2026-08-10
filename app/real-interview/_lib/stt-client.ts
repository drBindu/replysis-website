// app/real-interview/_lib/stt-client.ts
//
// Nothing upstream reaches the screen from here. Socket close codes, provider
// reason strings and HTTP statuses go to the console; the interviewee sees one
// of the two sentences below.

const LISTENING_UNAVAILABLE = "Listening is temporarily unavailable. Press Space to reconnect.";
const OUT_OF_CREDITS = "You have used your available credits. Choose a plan to continue.";

type StartOptions = {
  onStatus:        (s: string) => void;
  onPartial:       (text: string) => void;
  onFinal:         (text: string) => void;
  onError:         (err: string) => void;
  maxDelay?:       number;
  operatingPoint?: "enhanced" | "standard";
  authToken?:      string;   // Firebase ID token  -  sent as Authorization header
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

export class SpeechmaticsClient {
  private ws:          WebSocket | null        = null;
  private audioCtx:    AudioContext | null     = null;
  public  stream:      MediaStream | null      = null;
  private workletNode: AudioWorkletNode | null = null;
  private started = false;

  async start(opts: StartOptions) {
    if (this.started) return;
    this.started = true;

    try {
      opts.onStatus("Connecting");

      const tokenHeaders: Record<string, string> = {};
      if (opts.authToken) tokenHeaders["Authorization"] = `Bearer ${opts.authToken}`;
      const tr = await fetch("/api/stt/tokens", { cache: "no-store", headers: tokenHeaders });
      if (!tr.ok) throw Object.assign(new Error("token_request_failed"), { status: tr.status });

      const data = await tr.json();
      if (!data.token) throw new Error("token_missing");

      opts.onStatus("Connecting");

      // ── CORRECT URL: language goes in transcription_config NOT in URL ──
      this.ws = new WebSocket(
        `wss://${process.env.NEXT_PUBLIC_SPEECHMATICS_RT_HOST ?? "eu.rt.speechmatics.com"}/v2?jwt=${data.token}`
      );
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen    = async () => {
        opts.onStatus("Starting microphone");
        await this.setupAudio(opts);
      };
      this.ws.onmessage = (evt) => this.handleMessage(evt, opts);
      this.ws.onerror   = ()   => {
        console.error("[Replysis] Transcription socket error");
        opts.onError(LISTENING_UNAVAILABLE);
        this.stop();
      };
      this.ws.onclose   = (e)   => {
        if (this.started) {
          // code 1000 = normal intentional close; anything else is unexpected
          if (e.code !== 1000) {
            // The close code is for the log, not for the person interviewing.
            console.error(`[Replysis] Transcription socket closed unexpectedly code=${e.code}`);
            opts.onError(LISTENING_UNAVAILABLE);
          } else {
            opts.onStatus("Disconnected");
          }
        }
        this.stop();
      };

    } catch (err: any) {
      this.started = false;
      console.error("[Replysis] Could not start listening:", err?.status ?? err?.message ?? "Error");
      // 402 is the one case the person can act on themselves.
      opts.onError(err?.status === 402 ? OUT_OF_CREDITS : LISTENING_UNAVAILABLE);
    }
  }

  private async setupAudio(opts: StartOptions) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
          channelCount:     1,
          sampleRate:       16000,
        } as any,
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx  = new AudioCtx({ latencyHint: "interactive", sampleRate: 16000 });
      await this.audioCtx.resume();

      // ── StartRecognition  -  language always in config, never in URL ──
      this.ws?.send(JSON.stringify({
        message:      "StartRecognition",
        audio_format: {
          type:        "raw",
          encoding:    "pcm_f32le",
          sample_rate: this.audioCtx.sampleRate,
        },
        transcription_config: {
          language:        "en",
          operating_point: opts.operatingPoint || "enhanced",
          enable_partials: true,
          max_delay:       opts.maxDelay ?? 0.3,
          enable_entities: true,
          additional_vocab: [
            { content: "Wipro",         sounds_like: ["wee-pro"]           },
            { content: "Renasant",      sounds_like: ["ren-a-sant"]        },
            { content: "PostgreSQL",    sounds_like: ["post-gres"]         },
            { content: "Spring Boot",   sounds_like: ["spring boot"]       },
            { content: "Kubernetes",    sounds_like: ["koo-ber-neh-tees"]  },
            { content: "Terraform",     sounds_like: ["terra-form"]        },
            { content: "Microservices", sounds_like: ["micro-services"]    },
            { content: "GitOps",        sounds_like: ["git-ops"]           },
            { content: "CI/CD",         sounds_like: ["c-i-c-d", "ci cd"] },
            { content: "Replysis",     sounds_like: ["co-pilot-x"]       },
            { content: "Roosevelt",     sounds_like: ["roo-se-velt"]       },
          ],
        },
      }));

      const source = this.audioCtx.createMediaStreamSource(this.stream);

      try {
        // ── AudioWorklet (modern, preferred) ──
        const blob    = new Blob([WORKLET_CODE], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        await this.audioCtx.audioWorklet.addModule(blobUrl);
        URL.revokeObjectURL(blobUrl);

        this.workletNode = new AudioWorkletNode(this.audioCtx, "pcm-processor");
        this.workletNode.port.onmessage = (e) => {
          if (this.ws?.readyState === WebSocket.OPEN)
            this.ws.send(e.data.buffer);
        };
        source.connect(this.workletNode);
        this.workletNode.connect(this.audioCtx.destination);
        opts.onStatus("Listening...");

      } catch {
        // ── ScriptProcessor fallback ──
        const processor = this.audioCtx.createScriptProcessor(256, 1, 1);
        source.connect(processor);
        processor.connect(this.audioCtx.destination);
        processor.onaudioprocess = (e) => {
          if (this.ws?.readyState === WebSocket.OPEN)
            this.ws.send(e.inputBuffer.getChannelData(0).buffer);
        };
        opts.onStatus("Listening (fallback mode)...");
      }

    } catch (err: any) {
      console.error("Audio setup error:", err);
      opts.onError("Microphone access denied");
      this.stop();
    }
  }

  private handleMessage(evt: MessageEvent, opts: StartOptions) {
    try {
      const msg = JSON.parse(evt.data as string);
      if (msg.message === "AddTranscript" && msg.metadata?.transcript)
        opts.onFinal(msg.metadata.transcript);
      else if (msg.message === "AddPartialTranscript" && msg.metadata?.transcript)
        opts.onPartial(msg.metadata.transcript);
      else if (msg.message === "Error") {
        // `reason` is upstream free text and is never shown; only its type is
        // used to pick between the two messages that mean something here.
        const reason = String(msg.reason ?? msg.type ?? "");
        console.error(`[Replysis] Transcription error type=${msg.type ?? "unknown"}`);
        opts.onError(
          reason === "not_authorised"
            ? "Listening timed out. Press Space to reconnect."
            : LISTENING_UNAVAILABLE,
        );
        this.stop();
      }
    } catch {}
  }

  stop() {
    this.started = false;
    try { this.workletNode?.disconnect(); } catch {}
    try { this.audioCtx?.close(); }        catch {}
    try { this.stream?.getTracks().forEach(t => t.stop()); } catch {}
    try { this.ws?.close(); }              catch {}
    this.workletNode = null;
    this.audioCtx    = null;
    this.stream      = null;
    this.ws          = null;
  }
}
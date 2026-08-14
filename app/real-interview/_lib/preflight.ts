export type PreflightStatus = "idle" | "running" | "pass" | "warn" | "fail";

export type PreflightCheck = {
  id: "network" | "microphone" | "privacy";
  label: string;
  status: PreflightStatus;
  detail: string;
};

export type PreflightReport = {
  checks: PreflightCheck[];
  ready: boolean;
  checkedAt: number;
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function checkNetwork(): Promise<PreflightCheck> {
  if (!navigator.onLine) {
    return { id: "network", label: "Connection", status: "fail", detail: "You are offline. Reconnect to the internet and run the check again." };
  }

  const started = performance.now();
  try {
    const response = await fetch(`/api/healthz?preflight=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`health_${response.status}`);
    const latency = Math.max(1, Math.round(performance.now() - started));
    return {
      id: "network",
      label: "Connection",
      status: latency <= 1500 ? "pass" : "warn",
      detail: latency <= 1500
        ? `Replysis is reachable (${latency} ms).`
        : `Replysis is reachable, but the connection is slow (${latency} ms). Answers may take longer.`,
    };
  } catch {
    return { id: "network", label: "Connection", status: "fail", detail: "Replysis could not be reached. Check your network or VPN, then try again." };
  }
}

async function checkMicrophone(): Promise<PreflightCheck> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return { id: "microphone", label: "Microphone", status: "fail", detail: "This browser cannot access a microphone here. Use a current Chrome or Edge window over HTTPS." };
  }

  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    context = new AudioCtx();
    await context.resume();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let peak = 0;
    for (let i = 0; i < 5; i++) {
      analyser.getByteTimeDomainData(samples);
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128));
      await wait(120);
    }
    const label = stream.getAudioTracks()[0]?.label || "Selected microphone";
    return {
      id: "microphone",
      label: "Microphone",
      status: peak >= 2 ? "pass" : "warn",
      detail: peak >= 2
        ? `${label} is connected and receiving sound.`
        : `${label} is connected, but the signal is very quiet. Speak once or check the input level.`,
    };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    return {
      id: "microphone",
      label: "Microphone",
      status: "fail",
      detail: name === "NotAllowedError"
        ? "Microphone permission is blocked. Allow it in the browser address bar, then run the check again."
        : "No working microphone was found. Connect or select one, then run the check again.",
    };
  } finally {
    stream?.getTracks().forEach(track => track.stop());
    if (context && context.state !== "closed") await context.close().catch(() => undefined);
  }
}

function checkPrivacy(): PreflightCheck {
  return {
    id: "privacy",
    label: "Screen-sharing privacy",
    status: "warn",
    detail: "Browser tabs can appear in screen sharing. Use the Replysis Windows or macOS app when you need supported capture-protection controls, and verify them in your meeting app before the call.",
  };
}

export async function runPreflight(): Promise<PreflightReport> {
  const [network, microphone] = await Promise.all([checkNetwork(), checkMicrophone()]);
  const checks = [network, microphone, checkPrivacy()];
  return {
    checks,
    ready: checks.every(check => check.status !== "fail"),
    checkedAt: Date.now(),
  };
}

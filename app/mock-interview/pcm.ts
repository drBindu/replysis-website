// Microphone capture as plain 16 kHz, 16 bit, mono audio.
//
// The mock interview used to record with MediaRecorder as WebM. Phone browsers do not agree on that format (Safari has no
// WebM at all), so on some phones nothing was ever sent and no words appeared. Raw audio from the Web Audio API works in every
// browser, and it needs no container to unpack on the speech service, which is also quicker.

export const PCM_SAMPLE_RATE = 16_000;

/**
 * Turns blocks of float audio at the microphone's own rate (44.1 or 48 kHz) into 16 kHz signed 16 bit samples. Each output
 * sample is the average of the input samples it covers, which is enough of a low pass filter for speech. The fractional
 * position carries across blocks so the stream is continuous.
 */
export class Downsampler {
  private readonly ratio: number;
  private pos = 0;

  constructor(inputRate: number, outputRate: number = PCM_SAMPLE_RATE) {
    this.ratio = inputRate / outputRate;
  }

  process(input: Float32Array): Int16Array {
    const out: number[] = [];
    while (this.pos + this.ratio <= input.length) {
      const start = Math.max(0, Math.floor(this.pos));
      const end = Math.min(input.length, Math.floor(this.pos + this.ratio));
      let sum = 0;
      let n = 0;
      for (let i = start; i < end; i++) { sum += input[i]; n++; }
      const v = n > 0 ? sum / n : 0;
      const clamped = Math.max(-1, Math.min(1, v));
      out.push(Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff));
      this.pos += this.ratio;
    }
    this.pos -= input.length;
    return Int16Array.from(out);
  }
}

export type PcmCapture = { stop: () => void };

/**
 * Starts sending the microphone as 16 kHz PCM, in slices of about 100 ms. `context` is created from a tap by the caller so
 * iOS lets it run. Stopping releases the microphone but leaves the context for the next question.
 */
export function startPcmCapture(
  context: AudioContext,
  stream: MediaStream,
  onChunk: (pcm: ArrayBuffer) => void,
): PcmCapture {
  const source = context.createMediaStreamSource(stream);
  // ScriptProcessor is deprecated but is the one thing every phone browser runs the same way.
  const processor = context.createScriptProcessor(2048, 1, 1);
  const silent = context.createGain();
  silent.gain.value = 0;
  const down = new Downsampler(context.sampleRate);
  const sliceSamples = PCM_SAMPLE_RATE / 10;
  let pending: Int16Array[] = [];
  let pendingSamples = 0;
  let stopped = false;

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const block = down.process(event.inputBuffer.getChannelData(0));
    if (block.length === 0) return;
    pending.push(block);
    pendingSamples += block.length;
    if (pendingSamples < sliceSamples) return;
    const merged = new Int16Array(pendingSamples);
    let offset = 0;
    for (const part of pending) { merged.set(part, offset); offset += part.length; }
    pending = [];
    pendingSamples = 0;
    onChunk(merged.buffer);
  };

  source.connect(processor);
  processor.connect(silent);
  silent.connect(context.destination);

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try { processor.onaudioprocess = null; } catch { /* already gone */ }
      try { source.disconnect(); } catch { /* already gone */ }
      try { processor.disconnect(); } catch { /* already gone */ }
      try { silent.disconnect(); } catch { /* already gone */ }
      stream.getTracks().forEach(track => track.stop());
    },
  };
}

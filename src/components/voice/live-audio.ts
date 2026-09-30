/** Browser audio plumbing for Gemini Live: mic capture at 16 kHz and gapless playback at 24 kHz. */

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export class MicCapture {
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private node?: AudioWorkletNode;
  muted = false;

  async start(onChunk: (b64: string) => void, onLevel: (level: number) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.ctx = new AudioContext();
    await this.ctx.audioWorklet.addModule("/worklets/pcm-capture.js");
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "pcm-capture");
    this.node.port.onmessage = (e: MessageEvent<{ pcm?: ArrayBuffer; level: number }>) => {
      onLevel(this.muted ? 0 : e.data.level);
      if (e.data.pcm && !this.muted) onChunk(toBase64(e.data.pcm));
    };
    src.connect(this.node);
  }

  stop() {
    this.node?.port.close();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.ctx = undefined;
  }
}

export class PcmPlayer {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private nextTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private levelBuf: Uint8Array<ArrayBuffer>;

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 24000 });
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.ctx.destination);
    this.levelBuf = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  play(b64: string, mimeType?: string) {
    const rate = Number(mimeType?.match(/rate=(\d+)/)?.[1] ?? 24000);
    const pcm = fromBase64(b64);
    const buffer = this.ctx.createBuffer(1, pcm.length, rate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.analyser);
    const start = Math.max(this.ctx.currentTime + 0.02, this.nextTime);
    src.start(start);
    this.nextTime = start + buffer.duration;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  /** Barge-in: drop everything queued. */
  interrupt() {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {}
    }
    this.sources.clear();
    this.nextTime = 0;
  }

  level() {
    this.analyser.getByteTimeDomainData(this.levelBuf);
    let sum = 0;
    for (const v of this.levelBuf) {
      const x = (v - 128) / 128;
      sum += x * x;
    }
    return Math.sqrt(sum / this.levelBuf.length);
  }

  close() {
    this.interrupt();
    this.ctx.close().catch(() => {});
  }
}

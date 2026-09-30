// Captures mic audio, downsamples to 16 kHz mono PCM16, and posts ~100 ms chunks plus an RMS level.
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.buffer = [];
    this.carry = 0;
    this.chunk = 1600; // 100 ms at 16 kHz
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;

    let sum = 0;
    for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
    const rms = Math.sqrt(sum / input.length);

    // Linear-interpolated downsample.
    let pos = this.carry;
    while (pos < input.length) {
      const i = Math.floor(pos);
      const frac = pos - i;
      const a = input[i];
      const b = i + 1 < input.length ? input[i + 1] : a;
      this.buffer.push(a + (b - a) * frac);
      pos += this.ratio;
    }
    this.carry = pos - input.length;

    if (this.buffer.length >= this.chunk) {
      const out = new Int16Array(this.buffer.length);
      for (let i = 0; i < this.buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, this.buffer[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage({ pcm: out.buffer, level: rms }, [out.buffer]);
      this.buffer = [];
    } else {
      this.port.postMessage({ level: rms });
    }
    return true;
  }
}

registerProcessor("pcm-capture", PcmCapture);

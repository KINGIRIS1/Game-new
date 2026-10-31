// Hiệu ứng âm thanh ngắn tạo bằng Web Audio, không dùng file âm thanh.

export type Sfx = 'tap' | 'place' | 'upgrade' | 'claim' | 'error' | 'trong' | 'trongNhan';

let ctx: AudioContext | undefined;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

/** Trình duyệt chỉ cho phát âm thanh sau lần chạm đầu tiên. */
export function unlockAudio(): void {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, slideTo?: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Tiếng trống đồng: âm trầm tắt dần cộng một chút tiếng rè kim loại. */
function drum(start: number, freq: number, gain: number): void {
  tone(freq, start, 0.5, 'sine', gain, freq * 0.6);
  tone(freq * 2.7, start, 0.18, 'triangle', gain * 0.25);
}

export function play(name: Sfx): void {
  if (muted || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  switch (name) {
    case 'tap':
      tone(880, t, 0.05, 'triangle', 0.05);
      break;
    case 'place':
      tone(190, t, 0.14, 'sine', 0.25, 90);
      tone(420, t, 0.05, 'square', 0.03);
      navigator.vibrate?.(12);
      break;
    case 'upgrade':
      // Ba nốt ngũ cung đi lên.
      [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.09, 0.22, 'triangle', 0.12));
      drum(t + 0.27, 110, 0.3);
      navigator.vibrate?.([10, 40, 18]);
      break;
    case 'claim':
      drum(t, 90, 0.35);
      drum(t + 0.22, 120, 0.25);
      break;
    case 'error':
      tone(200, t, 0.12, 'square', 0.04, 150);
      break;
    // Trống trận: tiếng "tùng" trầm, cứ bốn tiếng có một tiếng nhấn trầm và vang hơn.
    case 'trong':
      drum(t, 105, 0.28);
      break;
    case 'trongNhan':
      drum(t, 78, 0.42);
      tone(52, t, 0.7, 'sine', 0.2);
      break;
  }
}

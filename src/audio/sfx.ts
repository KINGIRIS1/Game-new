// Hiệu ứng âm thanh ngắn tạo bằng Web Audio, không dùng file âm thanh.

import { RALLY_BEAT, SKILLS } from '../game/defs';

export type Sfx = 'tap' | 'place' | 'upgrade' | 'claim' | 'error' | 'trongTran';

let ctx: AudioContext | undefined;
let muted = false;
/** Tiếng Trống trận đi qua nút này, để tắt ngay khi trận kết thúc giữa chừng. */
let rallyBus: GainNode | undefined;

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

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, out?: AudioNode): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(out ?? ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Tiếng trống đồng: âm trầm tắt dần cộng một chút tiếng rè kim loại. */
function drum(start: number, freq: number, gain: number, out?: AudioNode): void {
  tone(freq, start, 0.5, 'sine', gain, freq * 0.6, out);
  tone(freq * 2.7, start, 0.18, 'triangle', gain * 0.25, undefined, out);
}

/** Tắt tiếng Trống trận còn đang vang (trận đã xong, rút quân, về kinh đô). */
export function stopRally(): void {
  if (!ctx || !rallyBus) return;
  rallyBus.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  rallyBus = undefined;
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
    case 'trongTran': {
      // Lạc tướng nện trống suốt thời gian thúc quân, đúng nhịp phần vẽ: tiếng trầm "tùng", tiếng nảy "tung" xen nhau,
      // nhịp đầu nện mạnh nhất.
      stopRally();
      rallyBus = ctx.createGain();
      rallyBus.connect(ctx.destination);
      const beats = Math.round(SKILLS.trongTran.duration / RALLY_BEAT);
      for (let i = 0; i < beats; i++) drum(t + i * RALLY_BEAT, i % 2 ? 105 : 72, i === 0 ? 0.55 : i % 2 ? 0.28 : 0.42, rallyBus);
      break;
    }
  }
}

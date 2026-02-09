import type { GapInfo, Settings } from "./types";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getLengthsMs(settings: Settings) {
  const h = clamp(settings.lenHour, 0.5, 4.0) * 1000;
  const t = clamp(settings.lenTen, 0.5, 4.0) * 1000;
  const o = clamp(settings.lenOne, 0.5, 4.0) * 1000;
  const p = clamp(settings.lenPing, 0.1, 1.5) * 1000;
  return { h, t, o, p };
}

export function computeGaps(settings: Settings): GapInfo {
  const { h, t, o, p } = getLengthsMs(settings);
  const totalAudio = h + t + o + p;
  const cycleMs = 15000;
  let remain = Math.max(0, cycleMs - totalAudio);

  const preferred = 200;
  let gapHT = 0,
    gapTO = 0,
    gapOP = 0,
    tail = 0;

  if (remain >= preferred * 3) {
    gapHT = preferred;
    gapTO = preferred;
    gapOP = preferred;
    tail = remain - preferred * 3;
  } else {
    const each = Math.floor(remain / 3);
    gapHT = each;
    gapTO = each;
    gapOP = remain - each * 2;
    tail = 0;
  }

  return { cycleMs, totalAudio, remain, gapHT, gapTO, gapOP, tail };
}

export function msUntilNext15sBoundary(nowMs: number): number {
  const mod = nowMs % 15000;
  let wait = 15000 - mod;
  if (wait === 15000) wait = 0;
  if (wait < 40) wait = 0;
  return wait;
}

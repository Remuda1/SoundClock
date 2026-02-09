import type { MapResult } from "./types";
import { ENV_KEYS } from "./constants";

export function cutsForCount(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0.5];
  return [1 / 3, 2 / 3];
}

export function mapHour(date: Date): MapResult {
  const h = date.getHours();
  const block = Math.floor((h % 12) / 3);
  const soundKey = ENV_KEYS[block];
  const cutCount = h % 3;
  return { soundKey, cutCount };
}

export function mapTenMin(date: Date): MapResult {
  const m = date.getMinutes();
  const band = Math.floor(m / 10);
  if (band <= 2) return { soundKey: "singingbowl3s", cutCount: band };
  return { soundKey: "aww3s", cutCount: band - 3 };
}

export function mapOneMin(date: Date): MapResult {
  const d = date.getMinutes() % 10;
  if (d === 0) return { soundKey: "Hocean", cutCount: 0 };
  if (d >= 1 && d <= 3) return { soundKey: "Horgan", cutCount: d - 1 };
  if (d >= 4 && d <= 6) return { soundKey: "Hfan2", cutCount: d - 4 };
  return { soundKey: "Hhvac", cutCount: d - 7 };
}

export function inActiveWindow(
  hour: number,
  onHour: number,
  offHour: number
): boolean {
  const on = Number(onHour);
  const off = Number(offHour);
  if (!Number.isFinite(on) || !Number.isFinite(off)) return true;
  if (on === off) return true;
  if (on < off) return hour >= on && hour < off;
  return hour >= on || hour < off;
}

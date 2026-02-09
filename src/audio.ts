import { Audio } from "expo-av";
import type { Segment, Settings } from "./types";
import { AUDIO_FILES } from "./constants";
import { getLengthsMs, computeGaps } from "./timing";
import { cutsForCount } from "./encoding";

const audioMap: Record<string, Audio.Sound | null> = {};

const AUDIO_REQUIRES: Record<string, any> = {
  "Horgan.mp3": require("../assets/Horgan.mp3"),
  "Hfan2.mp3": require("../assets/Hfan2.mp3"),
  "Hhvac.m4a": require("../assets/Hhvac.m4a"),
  "Hocean.mp3": require("../assets/Hocean.mp3"),
  "singingbowl3s.mp3": require("../assets/singingbowl3s.mp3"),
  "aww3s.mp3": require("../assets/aww3s.mp3"),
  "pinging.mp3": require("../assets/pinging.mp3"),
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export async function loadAudio(key: string): Promise<Audio.Sound | null> {
  try {
    if (audioMap[key]) return audioMap[key];

    const file = AUDIO_FILES.find((f) => f.key === key);
    if (!file) return null;

    const source = AUDIO_REQUIRES[file.file];
    if (!source) return null;

    const { sound } = await Audio.Sound.createAsync(source);
    audioMap[key] = sound;
    return sound;
  } catch {
    return null;
  }
}

export async function unloadAllAudio(): Promise<void> {
  for (const key in audioMap) {
    if (audioMap[key]) {
      await audioMap[key]?.unloadAsync();
      audioMap[key] = null;
    }
  }
}

export async function playSegment(
  segment: Segment,
  settings: Settings,
  onStop?: () => void
): Promise<void> {
  const sound = await loadAudio(segment.soundKey);
  if (!sound) return;

  const baseVol = clamp(
    settings.volume[segment.soundKey] ?? 1.0,
    0,
    1
  );
  await sound.setVolumeAsync(baseVol);
  await sound.playAsync();

  const gapMs = clamp(settings.cutGapMs, 30, 400);
  const fadeMs = clamp(settings.cutFadeMs, 0, 200);
  const cuts = cutsForCount(segment.cutCount);

  const timers: NodeJS.Timeout[] = [];

  for (const frac of cuts) {
    const cutPoint = Math.floor(frac * segment.lengthMs);
    const fadeDownStart = Math.max(0, cutPoint - fadeMs);
    const fadeDownDur = cutPoint - fadeDownStart;

    const steps = 10;
    const stepMs = Math.max(8, Math.floor(fadeDownDur / steps));

    for (let i = 0; i <= steps; i++) {
      const t = fadeDownStart + i * stepMs;
      const v = baseVol * (1 - i / steps);
      timers.push(
        setTimeout(() => {
          sound.setVolumeAsync(clamp(v, 0, 1));
        }, t)
      );
    }

    timers.push(
      setTimeout(() => {
        sound.setVolumeAsync(0);
      }, cutPoint)
    );

    const fadeUpStart = cutPoint + gapMs;
    const steps2 = 10;
    const stepMs2 = Math.max(8, Math.floor(fadeMs / steps2));

    for (let i = 0; i <= steps2; i++) {
      const t = fadeUpStart + i * stepMs2;
      const v = baseVol * (i / steps2);
      timers.push(
        setTimeout(() => {
          sound.setVolumeAsync(clamp(v, 0, 1));
        }, t)
      );
    }
  }

  await new Promise((resolve) => setTimeout(resolve, segment.lengthMs));

  timers.forEach(clearTimeout);
  await sound.pauseAsync();
  await sound.setVolumeAsync(0);
  onStop?.();
}

export async function playPing(
  lengthMs: number,
  settings: Settings,
  onStop?: () => void
): Promise<void> {
  const sound = await loadAudio("ping");
  if (!sound) return;

  const vol = clamp(settings.pingVolume ?? 0.35, 0, 1);
  await sound.setVolumeAsync(vol);
  await sound.playAsync();

  await new Promise((resolve) => setTimeout(resolve, lengthMs));

  await sound.pauseAsync();
  await sound.setVolumeAsync(0);
  onStop?.();
}

export async function runOneCycle(
  snapshotTime: Date,
  hour: { soundKey: string; cutCount: number },
  ten: { soundKey: string; cutCount: number },
  one: { soundKey: string; cutCount: number },
  settings: Settings,
  onPhaseChange?: (phase: string) => void
): Promise<void> {
  const gaps = computeGaps(settings);
  const { h, t, o, p } = getLengthsMs(settings);

  onPhaseChange?.("HOUR");
  await playSegment({ soundKey: hour.soundKey, lengthMs: h, cutCount: hour.cutCount }, settings);
  await new Promise((resolve) => setTimeout(resolve, gaps.gapHT));

  onPhaseChange?.("TEN");
  await playSegment({ soundKey: ten.soundKey, lengthMs: t, cutCount: ten.cutCount }, settings);
  await new Promise((resolve) => setTimeout(resolve, gaps.gapTO));

  onPhaseChange?.("ONE");
  await playSegment({ soundKey: one.soundKey, lengthMs: o, cutCount: one.cutCount }, settings);
  await new Promise((resolve) => setTimeout(resolve, gaps.gapOP));

  onPhaseChange?.("PING");
  await playPing(p, settings);

  onPhaseChange?.("SILENCE");
  await new Promise((resolve) => setTimeout(resolve, gaps.tail));

  onPhaseChange?.("IDLE");
}

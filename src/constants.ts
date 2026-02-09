import type { AudioFile, Settings } from "./types";

export const ENV_KEYS = ["Horgan", "Hfan2", "Hhvac", "Hocean"];
export const TEN_KEYS = ["singingbowl3s", "aww3s"];

export const AUDIO_FILES: AudioFile[] = [
  { key: "Horgan", file: "Horgan.mp3", kind: "env" },
  { key: "Hfan2", file: "Hfan2.mp3", kind: "env" },
  { key: "Hhvac", file: "Hhvac.m4a", kind: "env" },
  { key: "Hocean", file: "Hocean.mp3", kind: "env" },
  { key: "singingbowl3s", file: "singingbowl3s.mp3", kind: "ten" },
  { key: "aww3s", file: "aww3s.mp3", kind: "ten" },
  { key: "ping", file: "pinging.mp3", kind: "ping" },
];

export const DEFAULTS: Settings = {
  volume: {
    Horgan: 1.0,
    Hfan2: 1.0,
    Hhvac: 1.0,
    Hocean: 1.0,
    singingbowl3s: 1.0,
    aww3s: 1.0,
  },
  pingVolume: 0.35,
  lenHour: 4.0,
  lenTen: 4.0,
  lenOne: 4.0,
  lenPing: 0.5,
  cutGapMs: 100,
  cutFadeMs: 40,
  onHour: 7,
  offHour: 22,
};

export const ASYNC_STORAGE_KEY = "soundclock_15s_snap_v3";

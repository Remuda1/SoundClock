export type SoundKind = "env" | "ten" | "ping";

export interface AudioFile {
  key: string;
  file: string;
  kind: SoundKind;
}

export interface Settings {
  volume: Record<string, number>;
  pingVolume: number;
  lenHour: number;
  lenTen: number;
  lenOne: number;
  lenPing: number;
  cutGapMs: number;
  cutFadeMs: number;
  onHour: number;
  offHour: number;
}

export interface Segment {
  soundKey: string;
  lengthMs: number;
  cutCount: number;
}

export interface GapInfo {
  cycleMs: number;
  totalAudio: number;
  remain: number;
  gapHT: number;
  gapTO: number;
  gapOP: number;
  tail: number;
}

export interface MapResult {
  soundKey: string;
  cutCount: number;
}

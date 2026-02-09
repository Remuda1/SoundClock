import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Settings } from "./types";
import { DEFAULTS, ASYNC_STORAGE_KEY } from "./constants";

export async function loadSettings(): Promise<Settings | null> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch {
    return null;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(settings));
  } catch {
  }
}

export async function makeSettings(): Promise<Settings> {
  const saved = await loadSettings();
  if (saved) return saved;
  return {
    volume: { ...DEFAULTS.volume },
    pingVolume: DEFAULTS.pingVolume,
    lenHour: DEFAULTS.lenHour,
    lenTen: DEFAULTS.lenTen,
    lenOne: DEFAULTS.lenOne,
    lenPing: DEFAULTS.lenPing,
    cutGapMs: DEFAULTS.cutGapMs,
    cutFadeMs: DEFAULTS.cutFadeMs,
    onHour: DEFAULTS.onHour,
    offHour: DEFAULTS.offHour,
  };
}

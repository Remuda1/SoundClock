import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Settings } from "./types";
import { DEFAULTS } from "./constants";
import { loadSettings, makeSettings, saveSettings } from "./storage";
import { mapHour, mapTenMin, mapOneMin, inActiveWindow } from "./encoding";
import { computeGaps, msUntilNext15sBoundary, getLengthsMs } from "./timing";
import { runOneCycle, unloadAllAudio } from "./audio";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function fmt2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function App() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<string>("IDLE");
  const [alignMs, setAlignMs] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [usePreview, setUsePreview] = useState(false);
  const [previewTime, setPreviewTime] = useState("09:10");
  const [previewSec, setPreviewSec] = useState("0");
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const alignTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const s = await makeSettings();
      setSettings(s);
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const effectiveTime = (() => {
    if (!usePreview) return currentTime;
    const parts = previewTime.split(":");
    const hh = Number(parts[0] ?? 0);
    const mm = Number(parts[1] ?? 0);
    const ss = Number(previewSec ?? 0);
    const d = new Date();
    d.setHours(Number.isFinite(hh) ? hh : 0);
    d.setMinutes(Number.isFinite(mm) ? mm : 0);
    d.setSeconds(Number.isFinite(ss) ? ss : 0);
    d.setMilliseconds(0);
    return d;
  })();

  const stop = () => {
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    if (alignTimeoutRef.current) clearTimeout(alignTimeoutRef.current);
    setIsRunning(false);
    setPhase("IDLE");
    setAlignMs(null);
  };

  const start = async (oneCycleOnly: boolean = false) => {
    if (!settings || isRunning) return;
    setIsRunning(true);

    const loopStart = async () => {
      if (!settings) return;
      const realNow = new Date();
      const allowed = inActiveWindow(
        realNow.getHours(),
        settings.onHour,
        settings.offHour
      );

      if (!allowed) {
        loopTimeoutRef.current = setTimeout(loopStart, 500);
        return;
      }

      const snapshot = effectiveTime;
      const hour = mapHour(snapshot);
      const ten = mapTenMin(snapshot);
      const one = mapOneMin(snapshot);

      try {
        await runOneCycle(snapshot, hour, ten, one, settings, setPhase);
      } catch {
      }

      if (!isRunning) return;

      if (oneCycleOnly) {
        stop();
        return;
      }

      const wait = msUntilNext15sBoundary(Date.now());
      setAlignMs(wait || null);
      loopTimeoutRef.current = setTimeout(loopStart, wait);
    };

    const wait = msUntilNext15sBoundary(Date.now());
    setAlignMs(wait || null);
    alignTimeoutRef.current = setTimeout(loopStart, wait);
  };

  if (!settings) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7CFFB2" />
      </View>
    );
  }

  const realNow = new Date();
  const allowed = inActiveWindow(
    realNow.getHours(),
    settings.onHour,
    settings.offHour
  );
  const gaps = computeGaps(settings);
  const hourMapping = mapHour(effectiveTime);
  const tenMapping = mapTenMin(effectiveTime);
  const oneMapping = mapOneMin(effectiveTime);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0c0f" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Time Sound Clock</Text>
          <Text style={styles.clock}>
            {fmt2(currentTime.getHours())}:{fmt2(currentTime.getMinutes())}:{fmt2(currentTime.getSeconds())}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusBox}>
            <View style={[styles.statusDot, isRunning && styles.statusDotOn]} />
            <Text style={styles.statusText}>
              {isRunning ? "Running" : "Stopped"}
            </Text>
            <Text style={styles.statusPill}>Phase: {phase}</Text>
            {alignMs !== null && (
              <Text style={styles.statusPill}>Align: +{Math.round(alignMs)}ms</Text>
            )}
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.button, isRunning && styles.buttonDisabled]}
              onPress={() => start(false)}
              disabled={isRunning}
            >
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, !isRunning && styles.buttonDisabled]}
              onPress={stop}
              disabled={!isRunning}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => start(true)}
              disabled={isRunning}
            >
              <Text style={styles.buttonText}>Play 1 Cycle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Window</Text>
          <Text style={styles.infoText}>
            {fmt2(settings.onHour)}:00 → {fmt2(settings.offHour)}:00
          </Text>
          <Text style={styles.infoText}>
            Status: {allowed ? "inside window" : "outside window"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cycle Budget</Text>
          <Text style={styles.infoText}>
            Audio {(gaps.totalAudio / 1000).toFixed(2)}s + Silence{" "}
            {(gaps.remain / 1000).toFixed(2)}s = 15.00s
          </Text>
          <Text style={styles.infoText}>
            Gaps: HT {gaps.gapHT}ms, TO {gaps.gapTO}ms, OP {gaps.gapOP}ms, tail{" "}
            {gaps.tail}ms
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Mappings</Text>
          <Text style={styles.infoText}>
            Hour: {hourMapping.soundKey} • cuts {hourMapping.cutCount} (hour{" "}
            {effectiveTime.getHours()})
          </Text>
          <Text style={styles.infoText}>
            Ten: {tenMapping.soundKey} cuts {tenMapping.cutCount} (min{" "}
            {effectiveTime.getMinutes()})
          </Text>
          <Text style={styles.infoText}>
            One: {oneMapping.soundKey} cuts {oneMapping.cutCount} (digit{" "}
            {effectiveTime.getMinutes() % 10})
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview Time</Text>
          <View style={styles.twoCol}>
            <View>
              <Text style={styles.label}>Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={previewTime}
                onChangeText={setPreviewTime}
                placeholder="HH:MM"
              />
            </View>
            <View>
              <Text style={styles.label}>Seconds (0–59)</Text>
              <TextInput
                style={styles.input}
                value={previewSec}
                onChangeText={setPreviewSec}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.switchRow}>
              <Switch value={usePreview} onValueChange={setUsePreview} />
              <Text style={styles.label}>Use preview time</Text>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                const now = new Date();
                setPreviewTime(
                  `${fmt2(now.getHours())}:${fmt2(now.getMinutes())}`
                );
                setPreviewSec(String(now.getSeconds()));
              }}
            >
              <Text style={styles.buttonText}>Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Run Hours</Text>
          <View style={styles.twoCol}>
            <View>
              <Text style={styles.label}>On Hour (0–23)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.onHour)}
                onChangeText={(v) => {
                  const val = clamp(Number(v), 0, 23);
                  const newS = { ...settings, onHour: val };
                  setSettings(newS);
                  saveSettings(newS);
                }}
                keyboardType="number-pad"
              />
            </View>
            <View>
              <Text style={styles.label}>Off Hour (0–23)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.offHour)}
                onChangeText={(v) => {
                  const val = clamp(Number(v), 0, 23);
                  const newS = { ...settings, offHour: val };
                  setSettings(newS);
                  saveSettings(newS);
                }}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cycle Settings</Text>
          <View style={styles.fourCol}>
            <View>
              <Text style={styles.label}>Hour (s)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.lenHour)}
                onChangeText={(v) => {
                  const val = clamp(Number(v), 0.5, 4.0);
                  const newS = { ...settings, lenHour: val };
                  setSettings(newS);
                  saveSettings(newS);
                }}
                keyboardType="decimal-pad"
              />
            </View>
            <View>
              <Text style={styles.label}>Ten-min (s)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.lenTen)}
                onChangeText={(v) => {
                  const val = clamp(Number(v), 0.5, 4.0);
                  const newS = { ...settings, lenTen: val };
                  setSettings(newS);
                  saveSettings(newS);
                }}
                keyboardType="decimal-pad"
              />
            </View>
            <View>
              <Text style={styles.label}>One-min (s)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.lenOne)}
                onChangeText={(v) => {
                  const val = clamp(Number(v), 0.5, 4.0);
                  const newS = { ...settings, lenOne: val };
                  setSettings(newS);
                  saveSettings(newS);
                }}
                keyboardType="decimal-pad"
              />
            </View>
            <View>
              <Text style={styles.label}>Ping (s)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.lenPing)}
                onChangeText={(v) => {
                  const val = clamp(Number(v), 0.1, 1.5);
                  const newS = { ...settings, lenPing: val };
                  setSettings(newS);
                  saveSettings(newS);
                }}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.threeCol}>
            <View>
              <Text style={styles.label}>Cut silence (ms)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.cutGapMs)}
                onChangeText={(v) => {
                  const val = clamp(Number(v), 30, 400);
                  const newS = { ...settings, cutGapMs: val };
                  setSettings(newS);
                  saveSettings(newS);
                }}
                keyboardType="number-pad"
              />
            </View>
            <View>
              <Text style={styles.label}>Cut fade (ms)</Text>
              <TextInput
                style={styles.input}
                value={String(settings.cutFadeMs)}
                onChangeText={(v) => {
                  const val = clamp(Number(v), 0, 200);
                  const newS = { ...settings, cutFadeMs: val };
                  setSettings(newS);
                  saveSettings(newS);
                }}
                keyboardType="number-pad"
              />
            </View>
            <View>
              <Text style={styles.label}>Ping volume</Text>
              <TextInput
                style={styles.input}
                value={String(settings.pingVolume)}
                onChangeText={(v) => {
                  const val = clamp(Number(v), 0, 1);
                  const newS = { ...settings, pingVolume: val };
                  setSettings(newS);
                  saveSettings(newS);
                }}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const newS = {
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
              setSettings(newS);
              saveSettings(newS);
            }}
          >
            <Text style={styles.buttonText}>Reset Defaults</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Files</Text>
          {["Horgan", "Hfan2", "Hhvac", "Hocean", "singingbowl3s", "aww3s"].map(
            (key) => (
              <View key={key} style={styles.fileRow}>
                <Text style={styles.fileName}>{key}</Text>
                <View>
                  <Text style={styles.label}>Volume (0–1)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(settings.volume[key] ?? 1.0)}
                    onChangeText={(v) => {
                      const val = clamp(Number(v), 0, 1);
                      const newS = {
                        ...settings,
                        volume: { ...settings.volume, [key]: val },
                      };
                      setSettings(newS);
                      saveSettings(newS);
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0c0f",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e9e9ee",
    letterSpacing: 0.2,
  },
  clock: {
    fontSize: 14,
    color: "#a7a7b2",
    fontFamily: "Menlo",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e9e9ee",
    marginBottom: 12,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#666",
  },
  statusDotOn: {
    backgroundColor: "#7CFFB2",
  },
  statusText: {
    fontSize: 13,
    color: "#e9e9ee",
  },
  statusPill: {
    fontSize: 12,
    color: "#a7a7b2",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 13,
    color: "#e9e9ee",
  },
  infoText: {
    fontSize: 13,
    color: "#e9e9ee",
    marginBottom: 6,
    fontFamily: "Menlo",
  },
  label: {
    fontSize: 12,
    color: "#a7a7b2",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#e9e9ee",
    padding: 10,
    fontSize: 13,
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  fourCol: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  threeCol: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fileRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  fileName: {
    fontSize: 13,
    color: "#e9e9ee",
    fontFamily: "Menlo",
    marginBottom: 8,
  },
});

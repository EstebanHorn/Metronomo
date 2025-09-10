import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
  FlatList,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import VariablePulsePlayer from "../components/VariablePulsePlayer";
import CircleSubdivisions from "../components/CircleSubdivisions";
import { Colors } from "../constants/Colors";
import { PRESETS, type PresetId } from "../constants/presets";
import { SECTION_NAMES } from "../constants/Pulse";
import type { ActiveEvent, SoundRole } from "../types/Metronome";
import BpmWheel from "../components/BpmWheel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TapTempo from "../components/TapTempo";
import SubdivisionSelector from "../components/SubdivisionSelector";

// Ciclos de sonidos (usa SoundRole para no duplicar tipos)
const HEAD_CYCLE: SoundRole[] = [
  "click",
  "cajon_grave",
  "cajon_agudo",
  "cencerro",
  "silence",
];
const BODY_CYCLE: SoundRole[] = [
  "cajon_relleno",
  "cajon_agudo",
  "cajon_grave",
  "cencerro",
  "click",
  "silence",
];

export default function MetronomeModeScreen({
  presetId,
  onBack,
}: {
  presetId: PresetId;
  onBack?: () => void;
}) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const preset = PRESETS[presetId];

  const [bpm, setBpm] = useState<number>(110);
  const [subdivisions, setSubdivisions] = useState<number[]>([
    ...preset.INITIAL_SUBDIVISIONS,
  ]);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [soundMap, setSoundMap] = useState<SoundRole[][]>(() =>
    preset.DEFAULT_SOUND_MAP.map((r) => [...(r as SoundRole[])])
  );

  const nextFrom = (curr: SoundRole, cycle: SoundRole[]) => {
    const i = cycle.indexOf(curr);
    return cycle[(i + 1) % cycle.length];
  };

  const insets = useSafeAreaInsets();

  useEffect(() => {
    setSubdivisions([...preset.INITIAL_SUBDIVISIONS]);
    setSoundMap(preset.DEFAULT_SOUND_MAP.map((r) => [...(r as SoundRole[])]));
    setActiveEvent(null);
  }, [presetId]);

  const totalUnits = useMemo(
    () => preset.STRUCTURAL_PATTERN.reduce((a, b) => a + b, 0),
    [presetId]
  );
  const cycleMs = useMemo(
    () => (60000 / bpm) * (totalUnits / 2),
    [bpm, totalUnits]
  );

  const clampBpm = (x: number) =>
    Math.max(30, Math.min(300, Math.round(x || 0)));

  const setSubdivisionForSection = (i: number, v: number) =>
    setSubdivisions((prev) => prev.map((x, j) => (j === i ? v : x)));

  const onDotPress = (sectionIdx: number, k: number) => {
    setSoundMap((prev) =>
      prev.map((row, i) => {
        if (i !== sectionIdx) return row as SoundRole[];
        const next = [...(row as SoundRole[])];
        const curr = next[k] ?? (k === 0 ? "click" : "cajon_relleno");
        next[k] =
          k === 0 ? nextFrom(curr, HEAD_CYCLE) : nextFrom(curr, BODY_CYCLE);
        return next;
      })
    );
  };

  const onReset = () => {
    setSubdivisions([...preset.INITIAL_SUBDIVISIONS]);
    setSoundMap(preset.DEFAULT_SOUND_MAP.map((r) => [...(r as SoundRole[])]));
    setActiveEvent(null);
  };

  const shortSide = Math.min(width, height);
  const circleSize = Math.max(180, Math.min(shortSide * 0.9, 520));

  const styles = getStyles(theme);

  return (
    <FlatList
      data={[0]}
      keyExtractor={() => "content"}
      renderItem={() => null}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
      ListHeaderComponent={
        <View style={styles.main}>
          <View style={styles.headerRow}>
            {onBack && (
              <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Text style={styles.backBtnText}>← Home</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.title}>{preset.label}</Text>
          </View>

          <View style={styles.bpmContainer}>
            <BpmWheel
              value={bpm}
              onChange={(n) => setBpm(clampBpm(n))}
              min={30}
              max={300}
            />
            <TapTempo onBpmChange={(n) => setBpm(n)} min={30} max={300} />
          </View>

          <View style={styles.beatsContainer}>
            <View
              style={[
                styles.circleWrap,
                { width: circleSize, height: circleSize },
              ]}
            >
              <CircleSubdivisions
                size={circleSize}
                cycleMs={cycleMs}
                subdivisions={subdivisions}
                structuralPattern={preset.STRUCTURAL_PATTERN}
                activeEvent={activeEvent}
                soundMap={soundMap}
                onDotPress={onDotPress}
              />
              <View style={styles.playOverlay} pointerEvents="box-none">
                <VariablePulsePlayer
                  bpm={bpm}
                  structuralPattern={preset.STRUCTURAL_PATTERN}
                  subdivisions={subdivisions}
                  soundMap={soundMap}
                  onActive={setActiveEvent}
                  onReset={onReset}
                />
              </View>
            </View>

            <SubdivisionSelector
              names={SECTION_NAMES}
              subdivisions={subdivisions}
              onChange={setSubdivisionForSection}
              mtype={preset.meter}
            />
          </View>
        </View>
      }
    />
  );
}

const getStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    main: {
      width: "100%",
      paddingHorizontal: 10,
      backgroundColor: theme.ui.background,
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: 5,
      gap: 12,
    },
    headerRow: {
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      gap: 4,
      flexDirection: "row",
      marginTop: 4,
    },
    backBtn: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.ui.divider,
      backgroundColor: theme.ui.surface,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: theme.ui.text,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12,
            shadowRadius: 2,
          }
        : { elevation: 1 }),
    },
    backBtnText: {
      color: theme.ui.text,
      textAlign: "left",
      fontWeight: "600",
    },
    title: { fontSize: 18, fontWeight: "700", color: theme.ui.text },

    bpmContainer: {
      marginBottom: 8,
      gap: 8,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      width: "100%",
    },

    beatsContainer: {
      alignItems: "center",
      justifyContent: "space-around",
      gap: 12,
      width: "100%",
      marginTop: 5,
    },
    circleWrap: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    playOverlay: { position: "absolute" },

    btn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.ui.accent,
      borderWidth: 2,
      borderColor: theme.ui.accent,
      borderRadius: 8,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: theme.ui.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }
        : { elevation: 5 }),
    },
    btnText: { fontSize: 14, fontWeight: "bold", color: theme.ui.background },
  });

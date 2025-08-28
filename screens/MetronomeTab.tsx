// screens/MetronomeTab.tsx
import { Colors } from "../constants/Colors";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import VariablePulsePlayer from "../components/VariablePulsePlayer";
import {
  PATTERN,
  SECTION_NAMES,
  makeSilenceMap,
  sectionsFromPattern,
} from "../constants/Pulse";
import type { ActiveEvent } from "../types/Metronome";

type Section = { index: number; startMs: number; durMs: number };

/** Sombras cross-platform reutilizables */
const SHADOW_ACTIVE = { boxShadow: "0px 6px 15px #f3ad6cff" } as const;
const SHADOW_DEFAULT = { boxShadow: "0px 2px 2px #63615faa" } as const;

/** Dot memoizado: recibe props primitivas para que React.memo sea efectivo */
const Dot = React.memo(function Dot({
  x,
  y,
  deg,
  bgColor,
  isActive,
  isSilenced,
  onPress,
}: {
  x: number;
  y: number;
  deg: number; // grados
  bgColor: string;
  isActive: boolean;
  isSilenced: boolean;
  onPress: () => void;
}) {
  const style = useMemo(
    () => [
      styles.dot,
      {
        left: x - 7.5, // ancho 15
        top: y - 12.5, // alto 25
        transform: [{ rotate: `${deg}deg` }],
        backgroundColor: bgColor,
      },
      isActive && !isSilenced ? SHADOW_ACTIVE : SHADOW_DEFAULT,
      isSilenced ? { opacity: 0.45 } : null,
    ],
    [x, y, deg, bgColor, isActive, isSilenced]
  );

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={style} />
  );
});

type CircleMultiProps = {
  size?: number;
  cycleMs: number;
  sections: Section[];
  subdivs: number[];
  bpm: number;
  beatsPerCycle: number;
  silenceMap: boolean[][];
  onToggleLine: (sectionIdx: number, k: number) => void;

  // Reset props (se pasan hacia VariablePulsePlayer)
  initialSubdivs: number[];
  initialSilenceMap: boolean[][];
  onReset: (payload: { subdivs: number[]; silenceMap: boolean[][] }) => void;
};

function CircleMulti({
  size = 400,
  cycleMs,
  sections,
  subdivs,
  bpm,
  beatsPerCycle = 8,
  silenceMap,
  onToggleLine,
  initialSubdivs,
  initialSilenceMap,
  onReset,
}: CircleMultiProps) {
  const radius = size / 2 - 14;
  const center = size / 2;

  // Evento activo local (para no re-renderizar el padre)
  const [active, setActive] = useState<ActiveEvent | null>(null);

  // Ref estable para el toggle (evita recrear closures por dot)
  const onToggleLineRef = useRef(onToggleLine);
  useEffect(() => {
    onToggleLineRef.current = onToggleLine;
  }, [onToggleLine]);

  // Precalcular tiempos/ángulos/índices
  const dots = useMemo(() => {
    const arr: {
      key: string;
      sectionIdx: number;
      k: number;
      t: number; // ms en el ciclo
      x: number;
      y: number;
      angle: number; // radianes
      isClave: boolean;
      sepX: number; // separador en borde
      sepY: number;
    }[] = [];

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const n = Math.max(1, Math.min(12, subdivs[i] ?? 1));
      const startAngle = 2 * Math.PI * (s.startMs / cycleMs) - Math.PI / 2;
      const sweep = 2 * Math.PI * (s.durMs / cycleMs);

      const sepX = center + (radius + 1) * Math.cos(startAngle);
      const sepY = center + (radius + 1) * Math.sin(startAngle);

      for (let k = 0; k < n; k++) {
        const t = s.startMs + (s.durMs * k) / n;
        const angle = startAngle + sweep * (n === 1 ? 0 : k / n);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        arr.push({
          key: `${i}-${k}`,
          sectionIdx: i,
          k,
          t,
          x,
          y,
          angle,
          isClave: k === 0,
          sepX,
          sepY,
        });
      }
    }
    return arr;
  }, [sections, subdivs, cycleMs, center, radius]);

  // Determinar línea activa
  const activeKey = useMemo(() => {
    if (!active) return "";
    const sec = sections.find((s) => s.index === active.section);
    const tol = sec ? Math.min(45, Math.max(15, sec.durMs * 0.06)) : 25;

    let bestKey = "";
    let bestDiff = Infinity;
    for (const d of dots) {
      if (d.sectionIdx !== active.section) continue;
      const diff = Math.abs(active.tMs - d.t);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestKey = d.key;
      }
    }
    return bestDiff < tol ? bestKey : "";
  }, [active, dots, sections]);

  // Separadores (no interceptan toques)
  const separators = useMemo(() => {
    const uniq = new Map<number, { x: number; y: number }>();
    for (const d of dots) {
      if (!uniq.has(d.sectionIdx))
        uniq.set(d.sectionIdx, { x: d.sepX, y: d.sepY });
    }
    return Array.from(uniq.values());
  }, [dots]);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {/* Separadores radiales */}
      <View pointerEvents="none">
        {separators.map((p, i) => (
          <View
            key={`sep-${i}`}
            style={[
              styles.separator,
              {
                left: p.x - 1,
                top: p.y - 6,
              },
            ]}
          />
        ))}
      </View>

      {/* Player centrado */}
      <View style={styles.play}>
        <VariablePulsePlayer
          bpm={bpm}
          beatsPerCycle={beatsPerCycle}
          subdivs={subdivs}
          onActive={setActive}
          silenceMap={silenceMap}
          // reset wiring:
          initialSubdivs={initialSubdivs}
          initialSilenceMap={initialSilenceMap}
          onReset={onReset}
        />
      </View>

      {/* Líneas presionables (Dot memo) */}
      {dots.map((d) => {
        const deg = (d.angle + Math.PI / 2) * (180 / Math.PI);
        const isActive = activeKey === d.key;
        const isSilenced = !!silenceMap[d.sectionIdx]?.[d.k];

        // Paleta
        const bgColor = isActive
          ? isSilenced
            ? "#bebdbaff"
            : "#ffbb00ff"
          : d.isClave
          ? "#f3d139ff"
          : "#696968ff";

        return (
          <Dot
            key={d.key}
            x={d.x}
            y={d.y}
            deg={deg}
            bgColor={bgColor}
            isActive={isActive}
            isSilenced={isSilenced}
            onPress={() => onToggleLineRef.current(d.sectionIdx, d.k)}
          />
        );
      })}
    </View>
  );
}

export default function MetronomeTab() {
  const { width } = useWindowDimensions();

  const [bpm, setBpm] = useState<number>(110);
  const beatsPerCycle = 8; // dos compases de 4/4

  // Valores iniciales (memo para referencias estables)
  const INITIAL_SUBDIVS = useMemo(() => [3, 3, 4, 2, 4], []);
  const INITIAL_SILENCE = useMemo(
    () => makeSilenceMap(INITIAL_SUBDIVS),
    [INITIAL_SUBDIVS]
  );

  // Estado
  const [subdivs, setSubdivs] = useState<number[]>(INITIAL_SUBDIVS);
  const [silenceMap, setSilenceMap] = useState<boolean[][]>(INITIAL_SILENCE);

  // Mantener silenceMap en sync si cambian subdivs (preserva lo que exista)
  useEffect(() => {
    setSilenceMap((prev) =>
      subdivs.map((n, i) => {
        const old = prev[i] ?? [];
        const nextLen = Math.max(1, n);
        const next = Array(nextLen).fill(false) as boolean[];
        for (let k = 0; k < Math.min(old.length, nextLen); k++)
          next[k] = old[k];
        return next;
      })
    );
  }, [subdivs]);

  const cycleMs = useMemo(
    () => (60000 / bpm) * beatsPerCycle,
    [bpm, beatsPerCycle]
  );

  const sections: Section[] = useMemo(() => {
    const secs = sectionsFromPattern({ cycleMs, pattern: PATTERN });
    return secs.map((s, i) => ({ ...s, index: i }));
  }, [cycleMs]);

  const clamp = (x: number) => Math.max(30, Math.min(300, Math.round(x || 0)));
  const bpmMinus = (d = 5) => setBpm((x) => clamp(x - d));
  const bpmPlus = (d = 5) => setBpm((x) => clamp(x + d));
  const bpmFromInput = (txt: string) => {
    const n = parseInt(txt.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) setBpm(clamp(n));
  };

  // Selector: subdivisiones permitidas 2..5 (requisito)
  const SUBDIV_CHOICES = [2, 3, 4, 5];
  const setSubdivForSection = (sectionIdx: number, value: number) => {
    setSubdivs((prev) => prev.map((v, i) => (i === sectionIdx ? value : v)));
  };

  // Toggle de línea presionable
  const onToggleLine = (sectionIdx: number, k: number) => {
    setSilenceMap((prev) =>
      prev.map((row, i) => {
        if (i !== sectionIdx) return row;
        const next = [...row];
        next[k] = !next[k];
        return next;
      })
    );
  };

  return (
    <ScrollView>
      <View style={styles.main}>
        {/* BPM */}
        <View style={styles.bpmContainer}>
          <Text style={styles.bpmLabel}>BPM:</Text>
          <View style={styles.bpmButtonsRow}>
            <TouchableOpacity onPress={() => bpmMinus(1)} style={styles.btn}>
              <Text>-1</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => bpmMinus(5)} style={styles.btn}>
              <Text>-5</Text>
            </TouchableOpacity>
            <TextInput
              value={String(bpm)}
              onChangeText={bpmFromInput}
              onBlur={() => setBpm((c) => clamp(c))}
              keyboardType="numeric"
              style={styles.bpmInput}
            />
            <TouchableOpacity onPress={() => bpmPlus(5)} style={styles.btn}>
              <Text>+5</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => bpmPlus(1)} style={styles.btn}>
              <Text>+1</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cycleHint}>Ciclo: {cycleMs.toFixed(0)} ms</Text>
        </View>

        {/* Círculo + Selector */}
        <View style={styles.beatsContainer}>
          <View style={styles.singleCircleRow}>
            <CircleMulti
              size={Math.max(220, width - 40)}
              cycleMs={cycleMs}
              sections={sections}
              subdivs={subdivs}
              bpm={bpm}
              beatsPerCycle={beatsPerCycle}
              silenceMap={silenceMap}
              onToggleLine={onToggleLine}
              // reset wiring ↓↓↓
              initialSubdivs={INITIAL_SUBDIVS}
              initialSilenceMap={INITIAL_SILENCE}
              onReset={({ subdivs, silenceMap }) => {
                // Copias nuevas para forzar update
                setSubdivs([...subdivs]);
                setSilenceMap(silenceMap.map((r) => [...r]));
              }}
            />

            {/* Selector de subdivisiones por sección */}
            <View style={styles.selectorGrid}>
              {SECTION_NAMES.map((name, rowIdx) => (
                <View style={styles.selectorRow} key={`row-${rowIdx}`}>
                  <Text style={styles.selectorLabel}>{name}</Text>
                  <View style={styles.selectorDotsRow}>
                    {SUBDIV_CHOICES.map((val) => {
                      const selected = subdivs[rowIdx] === val;
                      return (
                        <TouchableOpacity
                          key={`s-${rowIdx}-${val}`}
                          onPress={() => setSubdivForSection(rowIdx, val)}
                          style={[
                            styles.selectorDot,
                            selected && styles.selectorDotSelected,
                          ]}
                        >
                          <Text style={styles.selectorDotText}>{val}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.light?.background ?? "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  // BPM
  bpmContainer: {
    marginBottom: 20,
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bpmLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  bpmButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bpmInput: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: "#f3ad6cff",
    borderRadius: 6,
    textAlign: "center",
    fontSize: 30,
    backgroundColor: "#fff",
  },
  cycleHint: {
    marginTop: 6,
    color: "#555",
  },

  // Contenedor
  beatsContainer: {
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    flex: 1,
    flexDirection: "column",
  },

  // Círculo único + selector
  singleCircleRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },

  // Círculo
  circle: {
    borderWidth: 1,
    borderColor: "#dbd8d855",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dot: {
    position: "absolute",
    width: 15,
    height: 25,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#272727ff",
  },
  play: {
    position: "absolute",
    alignContent: "center",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },

  // Separadores (pequeñas marcas radiales)
  separator: {
    position: "absolute",
    width: 2,
    height: 12,
    backgroundColor: "#ffffffff",
    borderRadius: 1,
  },

  // Selector 5x4 (subdiv 2..5)
  selectorGrid: {
    marginTop: 10,
    gap: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    width: "100%",
  },
  selectorRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
    alignSelf: "center",
  },
  selectorLabel: {
    width: 60,
  },
  selectorDotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  selectorDot: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f7f7",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
  },
  selectorDotSelected: {
    backgroundColor: "#ffd54f",
    borderColor: "#f9a825",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.38)",
  },
  selectorDotText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Botones genéricos
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fce563ff",
    borderWidth: 2,
    borderColor: "#f3ad6cff",
    borderRadius: 6,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
  },
});

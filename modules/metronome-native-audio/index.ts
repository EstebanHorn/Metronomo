// modules/metronome-native-audio/index.ts
import { requireNativeModule, EventEmitter } from "expo-modules-core";

export type ConfigureArgs = {
  bpm: number;
  beatsPerCycle: number; // p.ej. 8
  subdivs: number[]; // 5 valores (2..5)
  silenceMap?: boolean[][]; // [5][k]
  strongGain?: number;
  subdivGain?: number;
};

type Native = {
  configure(args: ConfigureArgs): boolean | Promise<boolean>;
  start(): void;
  stop(): void;
  setBpm(bpm: number): void;
  setSubdivs(subdivs: number[]): void;
  setSilenceMap(map: boolean[][]): void;
};

let Impl: Native;
try {
  Impl = requireNativeModule<Native>("MetronomeNativeAudio");
} catch (e) {
  console.warn(
    "[MetronomeNativeAudio] módulo nativo no encontrado; usando stub.",
    e
  );
  Impl = {
    configure: () => false,
    start: () => {},
    stop: () => {},
    setBpm: () => {},
    setSubdivs: () => {},
    setSilenceMap: () => {},
  };
}

// ---- EventEmitter para onBeat ----
// Tipado laxo para evitar 'never' en addListener según la versión instalada
const emitter: any = new EventEmitter(Impl as any);

export type OnBeatPayload = {
  section: number; // 0..4
  k: number; // 0..subdiv-1
  type: "clave" | "pulse"; // tipo de golpe
  tMs: number; // tiempo relativo dentro del ciclo (ms aprox)
};

export type ListenerSubscription = { remove: () => void };

export function addOnBeatListener(
  listener: (ev: OnBeatPayload) => void
): ListenerSubscription {
  // Forzamos 'any' para esquivar el genérico que infiere 'never'
  return emitter.addListener("onBeat", listener) as ListenerSubscription;
}

export default Impl;

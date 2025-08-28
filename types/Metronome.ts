// types/metronome.ts
export type EventType = "clave" | "pulse";

export type ActiveEvent = {
  /** Tiempo (ms) relativo dentro del ciclo actual del metrónomo */
  tMs: number;
  /** Índice de sección (0..4 para patrón [3,3,4,2,4]) */
  section: number;
  /** Índice del golpe dentro de la sección (0..subdiv-1); 0 = clave */
  k: number;
  /** Tipo del golpe: "clave" para k===0, "pulse" para el resto */
  type: EventType;
  /** Tick opcional (útil si discretizás UI): tMs / tickMs */
  tick: number;
};

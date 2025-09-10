// types/Metronome.ts

/** Roles (samples) disponibles en el motor y la UI */
export type SoundRole =
  | "cajon_grave"
  | "cajon_relleno"
  | "cajon_agudo"
  | "cencerro"
  | "click"
  | "silence";

/** Para eventos en runtime usamos directamente los roles nuevos */
export type EventType = SoundRole;

export type ActiveEvent = {
  /** Tiempo dentro del ciclo en ms (emitido por nativo) */
  tMs: number;
  /** Índice de sección 0..4 */
  section: number;
  /** Índice del golpe dentro de la sección (0..subdiv-1) */
  k: number;
  /** Tipo exacto de golpe (coincide 1:1 con el sample/UI) */
  type: EventType;
  /** Tick opcional (para discretizar/depurar) */
  tick: number;
};

// constants/presets.ts

export type Meter = "binary16" | "ternary12";
export type PresetId = "son_32" | "rumba_32" | "afro" | "hemiola";

// 🎵 Roles nuevos (samples reales)
export type SoundType =
  | "cajon_grave"
  | "cajon_relleno"
  | "cajon_agudo"
  | "cencerro"
  | "click"
  | "silence";

const SON_32 = [3, 3, 4, 2, 4] as const; // 16
const RUMBA_32 = [3, 4, 3, 2, 4] as const; // 16
const AFRO = [2, 3, 2, 2, 3] as const; // 12
const HEMIOLA = [2, 2, 2, 3, 3] as const; // 12

/**
 * Genera un mapa de sonidos por defecto para un patrón dado.
 * - Por defecto: cabeza de cada sección = "click"; el resto = "cajon_relleno".
 * - Si se pasan posiciones de clave (en unidades totales), esas quedan como "click".
 */
export function makeDefaultSoundMap(
  pattern: readonly number[],
  claveUnits: number[] = []
): SoundType[][] {
  const total = pattern.reduce((a, b) => a + b, 0);
  const isClave = new Array<boolean>(total).fill(false);

  for (const u of claveUnits) {
    const i = ((u % total) + total) % total; // wrap seguro
    isClave[i] = true;
  }

  let acc = 0;
  return pattern.map((len) => {
    const row: SoundType[] = Array.from({ length: len }, (_, k) => {
      const u = acc + k;
      if (isClave[u]) return "click"; // marca de clave prioritaria
      if (k === 0) return "click"; // cabeza de sección
      return "cajon_relleno"; // resto
    });
    acc += len;
    return row;
  });
}

export const PRESETS: Record<
  PresetId,
  {
    label: string;
    meter: Meter;
    STRUCTURAL_PATTERN: readonly number[];
    INITIAL_SUBDIVISIONS: readonly number[];
    DEFAULT_SOUND_MAP: SoundType[][];
  }
> = {
  son_32: {
    label: "Son 3-2",
    meter: "binary16",
    STRUCTURAL_PATTERN: SON_32,
    INITIAL_SUBDIVISIONS: SON_32,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(SON_32),
  },
  rumba_32: {
    label: "Rumba 3-2",
    meter: "binary16",
    STRUCTURAL_PATTERN: RUMBA_32,
    INITIAL_SUBDIVISIONS: RUMBA_32,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(RUMBA_32),
  },
  afro: {
    label: "Afro",
    meter: "ternary12",
    STRUCTURAL_PATTERN: AFRO,
    INITIAL_SUBDIVISIONS: AFRO,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(AFRO),
  },
  hemiola: {
    label: "Hemiola",
    meter: "ternary12",
    STRUCTURAL_PATTERN: HEMIOLA,
    INITIAL_SUBDIVISIONS: HEMIOLA,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(HEMIOLA),
  },
};

export const PRESET_ORDER: PresetId[] = [
  "son_32",
  "rumba_32",
  "afro",
  "hemiola",
];

// ⛔️ Importante: no re-exportar SoundType aquí (evita el error TS2484).

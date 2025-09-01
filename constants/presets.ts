// constants/presets.ts
export type Meter = "binary16" | "ternary12";
export type PresetId =
  | "son_32"
  | "son_23"
  | "rumba_32"
  | "rumba_23"
  | "afro"
  | "hemiola";

export const SECTION_NAMES = ["A", "Á", "B", "C", "B́"] as const;

const SON_32 = [3, 3, 4, 2, 4] as const; // 16
const RUMBA_32 = [3, 4, 3, 2, 4] as const; // 16
const AFRO = [2, 3, 2, 2, 3] as const; // 12
const HEMIOLA = [2, 2, 2, 3, 3] as const; // 12

type SoundType = "clave" | "sub" | "silence"; // defaults simples

// util simple
const clone2D = <T>(m: T[][]) => m.map((r) => [...r]);

export function makeDefaultSoundMap(
  pattern: readonly number[],
  claveUnits: number[] = [] // si no pasás nada: solo cabezas de sección
): SoundType[][] {
  const total = pattern.reduce((a, b) => a + b, 0);
  const isClave = new Array<boolean>(total).fill(false);
  claveUnits.forEach((u) => {
    const i = ((u % total) + total) % total;
    isClave[i] = true;
  });

  let acc = 0;
  return pattern.map((len) => {
    const row: SoundType[] = Array.from({ length: len }, (_, k) => {
      const u = acc + k;
      // si definiste posiciones de clave, respétalas; si no, solo k===0
      return (claveUnits.length ? isClave[u] : k === 0) ? "clave" : "sub";
    });
    acc += len;
    return row;
  });
}

/** offset en UNIDADES (octavos “estructurales”). 8 = mitad de 16; 6 = mitad de 12 */
export const PRESETS: Record<
  PresetId,
  {
    label: string;
    subtitle: string;
    meter: Meter;
    STRUCTURAL_PATTERN: readonly number[];
    INITIAL_SUBDIVISIONS: readonly number[]; // por defecto = estructural
    DEFAULT_SOUND_MAP: SoundType[][];
    PHASE_UNITS: number; // cuánto adelantamos el inicio del ciclo
  }
> = {
  son_32: {
    label: "Son 3/2",
    subtitle: "Binario · 16",
    meter: "binary16",
    STRUCTURAL_PATTERN: SON_32,
    INITIAL_SUBDIVISIONS: SON_32,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(SON_32), // solo cabezas
    PHASE_UNITS: 0,
  },
  son_23: {
    label: "Son 2/3",
    subtitle: "Binario · 16 (inicio opuesto)",
    meter: "binary16",
    STRUCTURAL_PATTERN: SON_32,
    INITIAL_SUBDIVISIONS: SON_32,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(SON_32), // solo cabezas
    PHASE_UNITS: 8, // arranque opuesto (16/2)
  },
  rumba_32: {
    label: "Rumba 3/2",
    subtitle: "Binario · 16",
    meter: "binary16",
    STRUCTURAL_PATTERN: RUMBA_32,
    INITIAL_SUBDIVISIONS: RUMBA_32,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(RUMBA_32),
    PHASE_UNITS: 0,
  },
  rumba_23: {
    label: "Rumba 2/3",
    subtitle: "Binario · 16 (inicio opuesto)",
    meter: "binary16",
    STRUCTURAL_PATTERN: RUMBA_32,
    INITIAL_SUBDIVISIONS: RUMBA_32,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(RUMBA_32),
    PHASE_UNITS: 8,
  },
  afro: {
    label: "Afro",
    subtitle: "Ternario · 12",
    meter: "ternary12",
    STRUCTURAL_PATTERN: AFRO,
    INITIAL_SUBDIVISIONS: AFRO,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(AFRO),
    PHASE_UNITS: 0,
  },
  hemiola: {
    label: "Hemiola",
    subtitle: "Ternario · 12",
    meter: "ternary12",
    STRUCTURAL_PATTERN: HEMIOLA,
    INITIAL_SUBDIVISIONS: HEMIOLA,
    DEFAULT_SOUND_MAP: makeDefaultSoundMap(HEMIOLA),
    PHASE_UNITS: 0,
  },
};

export const PRESET_ORDER: PresetId[] = [
  "son_32",
  "son_23",
  "rumba_32",
  "rumba_23",
  "afro",
  "hemiola",
];
export type { SoundType };

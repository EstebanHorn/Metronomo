// constants/Colors.ts

// 🎨 Paleta para los sonidos (roles nuevos)
const pulseColors = {
  cajon_grave: "#566c86ff", // Grave → azul grisáceo, más definido
  cajon_relleno: "#a698c9", // Subdivisiones (default), menos lavanda
  cajon_agudo: "#418372ff", // Agudo → verde petróleo, más brillante
  cencerro: "#cc7a29", // Bronce / cobre, más vivo
  click: "#624c69ff", // Clave (default), violeta-gris oscuro con contraste
  silence: "#c8c8cc", // Silencio → gris claro más neutro
};

// 🎨 Colores base globales (UI)
const base = {
  black: "#1c1c1c",
  whiteSmoke: "#ececec",
  davysGray: "#565654",
  lightGray: "#d1d1d6",
};

const dark = {
  almostBlack: "#1a1c1f",
  offWhite: "#EAEAEA",
  mediumGray: "#48484A",
  darkGray: "#2C2C2E",
};

// 🎨 Colores de los modos de metrónomo
const metronomeBase = {
  binary: "#cc7a29", // Violeta elegante
  ternary: "#418372", // Verde esmeralda
};

export const Colors = {
  light: {
    ui: {
      text: base.black,
      background: base.whiteSmoke,
      surface: "#f5f5f7",
      divider: base.lightGray,
      tabIconDefault: "#8e8e93",
      tabIconSelected: "#453853",
      accent: "#cc7a29", // cobre/naranja para botones y controles
    },
    metronome: {
      ...pulseColors,
      activeGlow: "#cc7a29", // resplandor naranja suave
      base: metronomeBase,
    },
  },
  dark: {
    ui: {
      text: dark.offWhite,
      background: dark.almostBlack,
      surface: dark.darkGray,
      divider: dark.mediumGray,
      tabIconDefault: "#8e8e93",
      tabIconSelected: "#e2dec4ff",
      accent: "#cc7a29", // mismo cobre/naranja
    },
    metronome: {
      ...pulseColors,
      activeGlow: "#cc7a29",
      base: metronomeBase,
    },
  },
};

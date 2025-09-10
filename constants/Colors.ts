// constants/Colors.ts

// 🎨 Colores principales
const brandYellow = "#f7c100"; // Click (clave principal)
const brandCyan = "#25a4c4"; // Cencerro
const brandOrange = "#f3ad6c"; // Glow activo/transiciones

// 🎨 Paleta para los sonidos
const pulseColors = {
  cajonGrave: "#ff4d6d", // Rojo vibrante
  cajonRelleno: "#3b82f6", // Azul intenso
  cajonAgudo: "#f97316", // Naranja
  cencerro: brandCyan, // Cyan
  click: brandYellow, // Amarillo
  silencio: "#d1d1d6", // Gris claro
};

// 🎨 Colores base globales
const base = {
  black: "#0a0908",
  whiteSmoke: "#f2f4f3",
  davysGray: "#565654",
  lightGray: "#D1D1D6",
};

// 🎨 Paleta modo oscuro
const dark = {
  almostBlack: "#121212",
  offWhite: "#EAEAEA",
  mediumGray: "#48484A",
  darkGray: "#2C2C2E",
};

// 🎨 Colores de los modos de metrónomo
const metronomeBase = {
  binary: "#7c3aed", // Violeta elegante
  ternary: "#10b981", // Verde esmeralda
};

export const Colors = {
  light: {
    text: base.black,
    background: base.whiteSmoke,
    tint: brandYellow,
    tabIconDefault: "#8e8e93",
    tabIconSelected: brandYellow,

    metronome: {
      ...pulseColors,
      activeGlow: brandOrange,
      base: metronomeBase,
    },
  },
  dark: {
    text: dark.offWhite,
    background: dark.almostBlack,
    tint: brandYellow,
    tabIconDefault: "#8e8e93",
    tabIconSelected: brandYellow,

    metronome: {
      ...pulseColors,
      activeGlow: brandOrange,
      base: metronomeBase,
    },
  },
};

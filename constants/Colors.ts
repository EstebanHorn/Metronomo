// constants/Colors.ts

// Defino los colores base con nombres para reutilizarlos
const brandYellow = "#f7c100"; // Tu Mikado Yellow para la clave
const brandCyan = "#25a4c4"; // Tu Pacific Cyan para el acento
const brandOrange = "#f3ad6c"; // El color del "resplandor" activo

const base = {
  black: "#0a0908",
  whiteSmoke: "#f2f4f3",
  davysGray: "#565654",
  lightGray: "#D1D1D6",
};

const dark = {
  almostBlack: "#121212", // Un negro un poco más suave que el puro
  offWhite: "#EAEAEA",
  mediumGray: "#48484A",
  darkGray: "#2C2C2E",
};

export const Colors = {
  light: {
    // Colores estándar de la app
    text: base.black,
    background: base.whiteSmoke,
    tint: brandYellow, // El color principal interactivo
    tabIconDefault: "#8e8e93",
    tabIconSelected: brandYellow,

    // Colores específicos para el metrónomo
    metronome: {
      clave: brandYellow,
      accent: brandCyan,
      sub: base.davysGray, // El gris oscuro para el pulso normal
      muted: base.lightGray, // Un gris claro para el estado silenciado
      activeGlow: brandOrange,
    },
  },
  dark: {
    // Colores estándar de la app
    text: dark.offWhite,
    background: dark.almostBlack,
    tint: brandYellow,
    tabIconDefault: "#8e8e93",
    tabIconSelected: brandYellow,

    // Colores específicos para el metrónomo en modo oscuro
    metronome: {
      clave: brandYellow, // El amarillo resalta perfecto
      accent: brandCyan, // El cyan también
      sub: dark.mediumGray, // Un gris intermedio que se ve bien sobre fondo oscuro
      muted: dark.darkGray, // Un gris bien oscuro para el estado silenciado
      activeGlow: brandOrange,
    },
  },
};

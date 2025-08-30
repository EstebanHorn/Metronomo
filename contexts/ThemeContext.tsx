// contexts/ThemeContext.tsx
import React, { createContext, useContext } from "react";
import { Colors } from "../constants/Colors";

// Definimos el tipo de nuestro tema para que TypeScript nos ayude
type Theme = typeof Colors.light;

// Creamos el Context, con el tema claro como valor por defecto
export const ThemeContext = createContext<Theme>(Colors.light);

// Creamos un "hook" personalizado para acceder fácilmente al tema en cualquier componente
export const useTheme = () => useContext(ThemeContext);

import { create } from "zustand";

export type SchemePreference = "light" | "dark" | "system";

// Кэш выбора темы в памяти. Источник правды — таблица settings в SQLite
// (src/data/settings.ts), сюда значение попадает один раз на старте и при
// переключении в Settings. Нужен именно стор, а не проп: тему читает каждый
// компонент через useAppTheme(), протаскивать её пропсами через всё дерево
// было бы шумом.
type UiState = {
  schemePreference: SchemePreference;
  hydrated: boolean;
  setSchemePreference: (preference: SchemePreference) => void;
  hydrate: (preference: SchemePreference) => void;
};

export const useUiStore = create<UiState>((set) => ({
  schemePreference: "light",
  hydrated: false,
  setSchemePreference: (schemePreference) => set({ schemePreference }),
  hydrate: (schemePreference) => set({ schemePreference, hydrated: true }),
}));

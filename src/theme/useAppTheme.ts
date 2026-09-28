import { useColorScheme } from "react-native";
import { useTheme, type Theme } from "./index";
import { useUiStore } from "../store/uiStore";

// Единственный способ получить тему в этом приложении. Голый useTheme() из
// шаблона всегда отдаёт светлую палитру и не знает про переключатель в
// Settings — если часть компонентов зовёт его напрямую, экраны уходят в
// тёмную тему, а карточки/кнопки остаются светлыми (так ломались CycleCalm и
// MoodPin, см. app-template/CLAUDE.md). Поэтому здесь и в src/components/*
// используется только useAppTheme().
//
// По умолчанию — light: системная тёмная тема телефона сама по себе не
// переключает приложение, для этого пользователь должен выбрать "System".
export function useAppTheme(): Theme {
  const preference = useUiStore((state) => state.schemePreference);
  const systemScheme = useColorScheme();
  const scheme =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  return useTheme(scheme);
}

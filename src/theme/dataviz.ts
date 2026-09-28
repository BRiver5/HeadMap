// Цветовые шкалы графиков. Держатся отдельно от colors.ts, потому что живут по
// другим правилам: не "подобрано на глаз", а прогнано через валидатор
// dataviz-скилла (scripts/validate_palette.js) — и светлый, и тёмный режим.
//
// Три разных работы — три разных набора:
//  * severity  — ОРДИНАЛЬНАЯ шкала (боль 1..10 разложена на 5 ступеней).
//                Один оттенок, монотонная светлота. Проверено: ALL CHECKS PASS
//                (light, ordinal) и ALL CHECKS PASS (dark, ordinal).
//  * regionHeat — ЧАСТОТА по зонам головы на HeadDiagram. Тоже один оттенок,
//                но семья акцента (орхидея), чтобы сигнатурный виджет читался
//                как часть бренда, а не как второй "градусник".
//  * categorical — идентичность (какой фактор/какая категория), не величина.
//                Здесь взят документированный набор хексов dataviz-скилла
//                (тот же, что у PackList/CarLog в портфеле) со своим локальным
//                порядком слот→категория. Проверено: ALL CHECKS PASS, worst
//                adjacent CVD ΔE 9.2. Предупреждение валидатора про контраст
//                aqua/magenta к поверхности снимается тем, что донат в этом
//                приложении всегда идёт с легендой и числами рядом, а не
//                цветом в одиночку.

import type { Theme } from "./index";

// 5 ступеней: боль 1-2, 3-4, 5-6, 7-8, 9-10.
const severityLight = ["#DFA167", "#CC7F42", "#B05C25", "#8A3F17", "#5E2810"];
// На тёмной поверхности интенсивность растёт в светлую сторону, а не в тёмную.
const severityDark = ["#8A5A33", "#B0723E", "#CC8C4E", "#E0A96C", "#F2C48E"];

const regionHeatLight = ["#CFA3C6", "#BA83AE", "#9F5F94", "#83407A", "#6B2160"];
const regionHeatDark = ["#5A2A52", "#7C3D70", "#9F5F94", "#BA83AE", "#D8B0CF"];

const categoricalLight = ["#2A78D6", "#EB6834", "#1BAF7A", "#4A3AA7", "#E87BA4"];
const categoricalDark = ["#3987E5", "#D95926", "#199E70", "#9085E9", "#D55181"];

export function severityRamp(theme: Theme): string[] {
  return theme.scheme === "dark" ? severityDark : severityLight;
}

// Боль 1..10 → цвет ступени. За пределами диапазона клампится, а не падает.
export function severityColor(theme: Theme, severity: number): string {
  const ramp = severityRamp(theme);
  const index = Math.min(ramp.length - 1, Math.max(0, Math.ceil(severity / 2) - 1));
  return ramp[index];
}

export function severityBandLabel(severity: number): string {
  if (severity <= 2) return "Very mild";
  if (severity <= 4) return "Mild";
  if (severity <= 6) return "Moderate";
  if (severity <= 8) return "Severe";
  return "Very severe";
}

export function regionHeatColor(theme: Theme, intensity: number): string {
  const ramp = theme.scheme === "dark" ? regionHeatDark : regionHeatLight;
  if (intensity <= 0) return theme.colors.surfaceAlt;
  const index = Math.min(ramp.length - 1, Math.max(0, Math.ceil(intensity * ramp.length) - 1));
  return ramp[index];
}

export function categoricalColors(theme: Theme): string[] {
  return theme.scheme === "dark" ? categoricalDark : categoricalLight;
}

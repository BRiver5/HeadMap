import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useAppTheme } from "../theme/useAppTheme";
import { severityColor } from "../theme/dataviz";
import { hourFraction, type DayIso } from "../lib/dates";
import { coveredDays, type Attack } from "../lib/episodes";
import { PressableScale } from "./PressableScale";

// Ячейка календаря — не точка и не заливка, а 24-часовой циферблат: дуга идёт
// от часа начала приступа до часа окончания, цвет дуги = сила боли. За счёт
// этого месяц целиком показывает не только "в какие дни болело", но и "в какое
// время суток и как долго" — то, ради чего дневник вообще ведут.
//
// Полночь — сверху, дальше по часовой стрелке. Приступ через полночь рисуется
// на обоих днях своим куском, а не дублируется целиком.

type Props = {
  day: DayIso;
  attacks: Attack[];
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isLogged: boolean;
  size: number;
  onPress: (day: DayIso) => void;
};

type Arc = { from: number; to: number; severity: number };

// Отрезок приступа, попадающий именно в этот день, в долях суток 0..1.
function arcsForDay(attacks: Attack[], day: DayIso): Arc[] {
  const arcs: Arc[] = [];
  for (const attack of attacks) {
    if (!coveredDays(attack).includes(day)) continue;
    const startsToday = attack.startedAt.slice(0, 10) === day;
    const endsToday = attack.endedAt ? attack.endedAt.slice(0, 10) === day : startsToday;
    const from = startsToday ? hourFraction(attack.startedAt) / 24 : 0;
    let to: number;
    if (attack.endedAt) {
      to = endsToday ? hourFraction(attack.endedAt) / 24 : 1;
    } else {
      // Идущий приступ: короткая метка от начала, а не дуга до конца суток —
      // длительности у него ещё нет, и рисовать её было бы выдумкой.
      to = Math.min(1, from + 1 / 24);
    }
    arcs.push({ from, to: Math.max(to, from + 0.02), severity: attack.severity });
  }
  return arcs;
}

export function DayDial({
  day,
  attacks,
  inMonth,
  isToday,
  isSelected,
  isLogged,
  size,
  onPress,
}: Props) {
  const theme = useAppTheme();
  const stroke = Math.max(3, size * 0.09);
  const radius = (size - stroke) / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const arcs = arcsForDay(attacks, day);
  const dayNumber = Number(day.slice(8, 10));

  return (
    <PressableScale
      onPress={() => onPress(day)}
      scaleTo={0.9}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={isSelected ? theme.colors.accent : "transparent"}
          fillOpacity={isSelected ? 0.12 : 0}
          stroke={isToday ? theme.colors.accent : inMonth ? theme.colors.border : "transparent"}
          strokeWidth={isToday ? 1.8 : 1}
        />
        {arcs.map((arc, index) => {
          const length = Math.max(0.03, arc.to - arc.from) * circumference;
          return (
            <Circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={severityColor(theme, arc.severity)}
              strokeWidth={stroke}
              strokeLinecap="butt"
              fill="none"
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={-arc.from * circumference}
              rotation={-90}
              originX={size / 2}
              originY={size / 2}
            />
          );
        })}
      </Svg>

      <Text
        style={{
          color: inMonth ? theme.colors.ink : theme.colors.inkFaint,
          fontSize: Math.round(size * 0.3),
          fontWeight: isToday ? "700" : "500",
        }}
      >
        {dayNumber}
      </Text>

      {isLogged && arcs.length === 0 ? (
        <View
          style={{
            position: "absolute",
            bottom: size * 0.14,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.inkFaint,
          }}
        />
      ) : null}
    </PressableScale>
  );
}

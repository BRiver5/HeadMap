import { Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useAppTheme } from "../theme/useAppTheme";
import { haptics } from "../services/haptics";
import { addMinutes, timeOf, type StampIso } from "../lib/dates";
import { PressableScale } from "./PressableScale";

// Время приступа/приёма шагами по 15 минут. Нативный date-picker тут был бы
// лишним: приложение и так знает день (его выбрали в календаре), а точность
// до минуты для дневника не нужна — нужна скорость ввода одной рукой.

export function TimeStepper({
  label,
  value,
  onChange,
  stepMinutes = 15,
}: {
  label: string;
  value: StampIso;
  onChange: (value: StampIso) => void;
  stepMinutes?: number;
}) {
  const theme = useAppTheme();

  const shift = (amount: number) => {
    haptics.tap();
    onChange(addMinutes(value, amount));
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      }}
    >
      <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
          {timeOf(value)}
        </Text>
        <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
          <PressableScale
            onPress={() => shift(-stepMinutes)}
            scaleTo={0.88}
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.radius.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <ChevronDown size={18} color={theme.colors.ink} />
          </PressableScale>
          <PressableScale
            onPress={() => shift(stepMinutes)}
            scaleTo={0.88}
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.radius.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <ChevronUp size={18} color={theme.colors.ink} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

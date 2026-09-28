import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppTheme } from "../theme/useAppTheme";
import { severityBandLabel, severityColor } from "../theme/dataviz";
import { staggerDelay } from "../theme/motion";
import { haptics } from "../services/haptics";
import { PressableScale } from "./PressableScale";

// Шкала боли 1..10 квадратиками вместо слайдера: пальцем по слайдеру во время
// приступа попадать неудобно, а тап по клетке — одно движение. Цвет клетки
// берётся из той же ординальной шкалы, что и дуги в календаре, поэтому "7"
// здесь и "7" на циферблате — один и тот же цвет.

export function SeverityScale({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const theme = useAppTheme();

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((level, index) => {
          const active = level <= value;
          return (
            <Animated.View
              key={level}
              style={{ flex: 1 }}
              entering={FadeInDown.delay(staggerDelay(index, 25)).duration(260)}
            >
              <PressableScale
                onPress={() => {
                  haptics.tap();
                  onChange(level);
                }}
                scaleTo={0.9}
                style={{
                  height: 44,
                  borderRadius: theme.radius.sm,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? severityColor(theme, level) : theme.colors.surfaceAlt,
                  borderWidth: level === value ? 2 : 0,
                  borderColor: theme.colors.ink,
                }}
              >
                <Text
                  style={{
                    color: active ? "#FFFFFF" : theme.colors.inkFaint,
                    ...theme.typography.caption,
                    fontWeight: "600",
                  }}
                >
                  {level}
                </Text>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
      <Text
        style={{
          color: theme.colors.inkMuted,
          ...theme.typography.caption,
          marginTop: theme.spacing.sm,
        }}
      >
        {value} of 10 · {severityBandLabel(value)}
      </Text>
    </View>
  );
}

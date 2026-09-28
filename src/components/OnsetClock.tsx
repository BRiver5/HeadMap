import { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G, Line } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useAppTheme } from "../theme/useAppTheme";

const AnimatedLine = Animated.createAnimatedComponent(Line);

// Круглая гистограмма начала приступов по часам суток. Обычный бар-чарт на 24
// колонки здесь врал бы формой: полночь и 23:00 — соседние часы, а на прямой
// шкале они оказываются на противоположных концах.

function Spoke({
  angle,
  length,
  radius,
  center,
  color,
  width,
  delay,
}: {
  angle: number;
  length: number;
  radius: number;
  center: number;
  color: string;
  width: number;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [length, delay]);

  const animatedProps = useAnimatedProps(() => {
    const outer = radius + length * progress.value;
    return {
      x2: center + Math.sin(angle) * outer,
      y2: center - Math.cos(angle) * outer,
    };
  });

  return (
    <AnimatedLine
      x1={center + Math.sin(angle) * radius}
      y1={center - Math.cos(angle) * radius}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

export function OnsetClock({
  bins,
  size = 180,
  meanHour,
}: {
  bins: number[];
  size?: number;
  meanHour?: number | null;
}) {
  const theme = useAppTheme();
  const center = size / 2;
  const innerRadius = size * 0.24;
  const maxLength = size * 0.2;
  const max = Math.max(1, ...bins);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke={theme.colors.border}
          strokeWidth={1}
        />
        <G>
          {bins.map((value, hour) => {
            if (value === 0) return null;
            const angle = (hour / 24) * 2 * Math.PI;
            return (
              <Spoke
                key={hour}
                angle={angle}
                length={(value / max) * maxLength}
                radius={innerRadius}
                center={center}
                color={theme.colors.accent}
                width={Math.max(4, size * 0.035)}
                delay={hour * 22}
              />
            );
          })}
        </G>
        {typeof meanHour === "number" ? (
          <Line
            x1={center}
            y1={center}
            x2={center + Math.sin((meanHour / 24) * 2 * Math.PI) * (innerRadius - 6)}
            y2={center - Math.cos((meanHour / 24) * 2 * Math.PI) * (innerRadius - 6)}
            stroke={theme.colors.ink}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>

      {(["00", "06", "12", "18"] as const).map((label, index) => {
        const angle = (index / 4) * 2 * Math.PI;
        return (
          <Text
            key={label}
            style={{
              position: "absolute",
              color: theme.colors.inkFaint,
              ...theme.typography.caption,
              left: center + Math.sin(angle) * (size * 0.45) - 9,
              top: center - Math.cos(angle) * (size * 0.45) - 9,
              width: 18,
              textAlign: "center",
            }}
          >
            {label}
          </Text>
        );
      })}
    </View>
  );
}

import { Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";
import { AnimatedCounter } from "./AnimatedCounter";

// Плитка с числом. Число не появляется мгновенно, а накручивается — это тот
// самый "hero"-элемент, который держит главный экран и верх Stats.

export function StatTile({
  value,
  label,
  suffix,
  caption,
  animated = true,
  tone = "ink",
}: {
  value: number | string;
  label: string;
  suffix?: string;
  caption?: string;
  animated?: boolean;
  tone?: "ink" | "accent";
}) {
  const theme = useAppTheme();
  const color = tone === "accent" ? theme.colors.accent : theme.colors.ink;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {typeof value === "number" && animated ? (
          <AnimatedCounter
            value={value}
            style={{
              color,
              ...theme.typography.display,
              padding: 0,
              margin: 0,
              minWidth: 40,
            }}
          />
        ) : (
          <Text style={{ color, ...theme.typography.display }}>{value}</Text>
        )}
        {suffix ? (
          <Text
            style={{
              color: theme.colors.inkMuted,
              ...theme.typography.subtitle,
              marginBottom: 6,
              marginLeft: 4,
            }}
          >
            {suffix}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          color: theme.colors.inkMuted,
          ...theme.typography.label,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
      {caption ? (
        <Text
          style={{ color: theme.colors.inkFaint, ...theme.typography.caption, marginTop: 2 }}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

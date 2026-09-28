import { Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";
import { haptics } from "../services/haptics";
import { PressableScale } from "./PressableScale";

// Пресет в один тап. Ввод факторов и препаратов повторяющийся и структурный,
// печатать "Short sleep" каждый вечер никто не станет — поэтому весь ввод,
// кроме заметки, собран из этих чипов.

type Props = {
  label: string;
  selected?: boolean;
  tone?: "default" | "accent";
  onPress?: () => void;
  trailing?: React.ReactNode;
};

export function Chip({ label, selected = false, tone = "default", onPress, trailing }: Props) {
  const theme = useAppTheme();
  const accent = tone === "accent";

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        backgroundColor: selected
          ? theme.colors.accent
          : accent
            ? theme.colors.surfaceAlt
            : theme.colors.surface,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
      }}
    >
      <Text
        style={{
          color: selected ? theme.colors.onAccent : theme.colors.ink,
          ...theme.typography.caption,
          fontWeight: selected ? "600" : "400",
        }}
      >
        {label}
      </Text>
      {trailing}
    </View>
  );

  if (!onPress) return content;

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress();
      }}
    >
      {content}
    </PressableScale>
  );
}

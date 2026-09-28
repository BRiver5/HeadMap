import { Switch } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function Toggle({ value, onValueChange }: Props) {
  const theme = useAppTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
      // Ползунок намеренно фиксированно светлый, а не theme.colors.onAccent:
      // в тёмной палитре onAccent тёмный, и переключатель сливался бы с треком.
      thumbColor="#FFFFFF"
    />
  );
}

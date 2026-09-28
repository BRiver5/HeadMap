import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppTheme } from "../theme/useAppTheme";
import { staggerDelay } from "../theme/motion";
import { haptics } from "../services/haptics";
import { dayLabel, type DayIso } from "../lib/dates";
import { FACTORS, FACTOR_GROUPS } from "../lib/presets";
import { saveDayFactors } from "../data/days";
import { SheetModal } from "./SheetModal";
import { Chip } from "./Chip";
import { PrimaryButton } from "./PrimaryButton";
import { SuccessBurst } from "./SuccessBurst";

// Факторы дня. Сохранение с пустым списком — тоже осмысленное действие:
// "сегодня ничего из этого не было" и есть контрольный день, без которого
// анализ на экране Insights не с чем сравнивать.

export function FactorsSheet({
  visible,
  day,
  initialFactors,
  onClose,
  onSaved,
}: {
  visible: boolean;
  day: DayIso;
  initialFactors: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useAppTheme();
  const [selected, setSelected] = useState<string[]>(initialFactors);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(initialFactors);
    setBurst(false);
  }, [visible, initialFactors]);

  const toggle = (key: string) =>
    setSelected((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
    );

  const submit = async () => {
    await saveDayFactors(day, selected);
    haptics.success();
    setBurst(true);
  };

  return (
    <SheetModal
      visible={visible}
      title="Day factors"
      subtitle={dayLabel(day)}
      onClose={onClose}
      maxHeightRatio={0.88}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text
          style={{
            color: theme.colors.inkMuted,
            ...theme.typography.body,
            marginBottom: theme.spacing.lg,
          }}
        >
          Mark what this day looked like. Days with nothing marked count too — they are what the
          rest is compared against.
        </Text>

        {FACTOR_GROUPS.map((group, index) => (
          <Animated.View
            key={group}
            entering={FadeInDown.delay(staggerDelay(index)).duration(360)}
            style={{ marginBottom: theme.spacing.lg }}
          >
            <Text
              style={{
                color: theme.colors.inkMuted,
                ...theme.typography.label,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: theme.spacing.sm,
              }}
            >
              {group}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
              {FACTORS.filter((factor) => factor.group === group).map((factor) => (
                <Chip
                  key={factor.key}
                  label={factor.label}
                  selected={selected.includes(factor.key)}
                  onPress={() => toggle(factor.key)}
                />
              ))}
            </View>
          </Animated.View>
        ))}

        <View style={{ alignItems: "center", marginBottom: theme.spacing.md }}>
          {burst ? (
            <SuccessBurst
              visible
              onDone={() => {
                onSaved();
                onClose();
              }}
            />
          ) : null}
        </View>

        {!burst ? (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <PrimaryButton
              label={selected.length > 0 ? `Save ${selected.length} marked` : "Save as a clear day"}
              onPress={submit}
            />
          </View>
        ) : null}
      </ScrollView>
    </SheetModal>
  );
}

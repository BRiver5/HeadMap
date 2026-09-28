import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CircleDot, Pill } from "lucide-react-native";
import { useAppTheme } from "../theme/useAppTheme";
import { severityBandLabel, severityColor } from "../theme/dataviz";
import { staggerDelay } from "../theme/motion";
import { dayLabel, formatDuration, timeOf, type DayIso } from "../lib/dates";
import { durationMinutes, type Attack } from "../lib/episodes";
import { factorLabel, medLabel, regionLabel } from "../lib/presets";
import { SheetModal } from "./SheetModal";
import { Chip } from "./Chip";
import { PrimaryButton } from "./PrimaryButton";
import { SecondaryButton } from "./SecondaryButton";
import { PressableScale } from "./PressableScale";

// Шторка одного дня: что уже записано и два явных действия. Пустой день
// показывает не абстрактное "нет данных", а чеклист с чего начать — по нему
// сразу видно, что дневник состоит из двух частей, а не из одних приступов.

export function DaySheet({
  visible,
  day,
  attacks,
  factors,
  onClose,
  onAddAttack,
  onEditAttack,
  onEditFactors,
}: {
  visible: boolean;
  day: DayIso;
  attacks: Attack[];
  factors: string[];
  onClose: () => void;
  onAddAttack: () => void;
  onEditAttack: (attack: Attack) => void;
  onEditFactors: () => void;
}) {
  const theme = useAppTheme();
  const empty = attacks.length === 0 && factors.length === 0;

  return (
    <SheetModal
      visible={visible}
      title={dayLabel(day)}
      subtitle={
        attacks.length > 0
          ? `${attacks.length} attack${attacks.length > 1 ? "s" : ""} logged`
          : "No attack logged"
      }
      onClose={onClose}
      maxHeightRatio={0.85}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {empty ? (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              gap: theme.spacing.sm,
            }}
          >
            <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
              Nothing logged yet
            </Text>
            {[
              "Mark the day's factors — sleep, food, stress, weather.",
              "Add an attack only if there was one.",
              "Both together are what the analysis reads.",
            ].map((line, index) => (
              <View key={line} style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.accent, ...theme.typography.body }}>
                  {index + 1}
                </Text>
                <Text
                  style={{ color: theme.colors.inkMuted, ...theme.typography.body, flex: 1 }}
                >
                  {line}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {attacks.map((attack, index) => {
          const minutes = durationMinutes(attack);
          return (
            <Animated.View
              key={attack.id}
              entering={FadeInDown.delay(staggerDelay(index)).duration(360)}
              style={{ marginBottom: theme.spacing.sm }}
            >
              <PressableScale
                onPress={() => onEditAttack(attack)}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.lg,
                  padding: theme.spacing.lg,
                  borderLeftWidth: 4,
                  borderLeftColor: severityColor(theme, attack.severity),
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
                    {timeOf(attack.startedAt)}
                    {attack.endedAt ? ` – ${timeOf(attack.endedAt)}` : " · ongoing"}
                  </Text>
                  <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
                    {minutes !== null ? formatDuration(minutes) : "no end yet"}
                  </Text>
                </View>

                <Text
                  style={{
                    color: theme.colors.inkMuted,
                    ...theme.typography.caption,
                    marginTop: 2,
                  }}
                >
                  {attack.severity}/10 · {severityBandLabel(attack.severity)}
                  {attack.regions.length > 0
                    ? ` · ${attack.regions.map(regionLabel).join(", ")}`
                    : ""}
                </Text>

                {attack.doses.length > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing.xs,
                      marginTop: theme.spacing.sm,
                    }}
                  >
                    <Pill size={14} color={theme.colors.inkMuted} />
                    <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
                      {attack.doses
                        .map((dose) => `${medLabel(dose.medKey)} ${timeOf(dose.takenAt)}`)
                        .join(" · ")}
                    </Text>
                  </View>
                ) : null}

                {attack.note ? (
                  <Text
                    style={{
                      color: theme.colors.inkMuted,
                      ...theme.typography.body,
                      marginTop: theme.spacing.sm,
                    }}
                  >
                    {attack.note}
                  </Text>
                ) : null}
              </PressableScale>
            </Animated.View>
          );
        })}

        <View style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.xs,
              marginBottom: theme.spacing.sm,
            }}
          >
            <CircleDot size={14} color={theme.colors.inkMuted} />
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.label }}>
              Day factors
            </Text>
          </View>
          {factors.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
              {factors.map((key) => (
                <Chip key={key} label={factorLabel(key)} tone="accent" />
              ))}
            </View>
          ) : (
            <Text style={{ color: theme.colors.inkFaint, ...theme.typography.body }}>
              Not marked yet.
            </Text>
          )}
        </View>

        <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
          <PrimaryButton label="Log attack" onPress={onAddAttack} />
          <SecondaryButton
            label={factors.length > 0 ? "Edit day factors" : "Mark day factors"}
            onPress={onEditFactors}
          />
        </View>
      </ScrollView>
    </SheetModal>
  );
}

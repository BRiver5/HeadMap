import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft } from "lucide-react-native";
import { useAppTheme } from "../src/theme/useAppTheme";
import { staggerDelay } from "../src/theme/motion";
import { severityColor } from "../src/theme/dataviz";
import { addDays, formatClockHour, formatDuration, todayIso, type DayIso } from "../src/lib/dates";
import {
  currentFreeStreak,
  durationSummary,
  longestFreeStreak,
  onsetHours,
  regionShares,
  severityBands,
  weeklyPainDays,
  type Attack,
} from "../src/lib/episodes";
import { onsetClock } from "../src/lib/rhythm";
import { medicationDays } from "../src/lib/medication";
import { medLabel, regionLabel, type RegionKey } from "../src/lib/presets";
import { listAttacks } from "../src/data/attacks";
import { listLoggedDays } from "../src/data/days";
import { DEFAULT_SETTINGS, loadSettings, type AppSettings } from "../src/data/settings";
import { Card } from "../src/components/Card";
import { BarChart } from "../src/components/BarChart";
import { DonutChart } from "../src/components/DonutChart";
import { AnimatedRing } from "../src/components/AnimatedRing";
import { HeadDiagram } from "../src/components/HeadDiagram";
import { OnsetClock } from "../src/components/OnsetClock";
import { StatTile } from "../src/components/StatTile";
import { EmptyState } from "../src/components/EmptyState";
import { PressableScale } from "../src/components/PressableScale";

export default function StatsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = todayIso();

  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [loggedDays, setLoggedDays] = useState<DayIso[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const load = useCallback(() => {
    Promise.all([listAttacks(), listLoggedDays(), loadSettings()]).then(
      ([loadedAttacks, days, loadedSettings]) => {
        setAttacks(loadedAttacks);
        setLoggedDays(days);
        setSettings(loadedSettings);
      }
    );
  }, []);

  useFocusEffect(load);

  const weekly = useMemo(() => weeklyPainDays(attacks, today, 8), [attacks, today]);
  const bands = useMemo(() => severityBands(attacks), [attacks]);
  const regions = useMemo(() => regionShares(attacks), [attacks]);
  const durations = useMemo(() => durationSummary(attacks), [attacks]);
  const clock = useMemo(() => onsetClock(onsetHours(attacks)), [attacks]);
  const meds = useMemo(
    () => medicationDays(attacks, addDays(today, -29), today, 30),
    [attacks, today]
  );

  const regionIntensities = useMemo(() => {
    const map: Partial<Record<RegionKey, number>> = {};
    for (const share of regions) map[share.region] = share.intensity;
    return map;
  }, [regions]);

  const sections: { key: string; title: string; caption?: string; body: React.ReactNode }[] = [];

  sections.push({
    key: "streaks",
    title: "Where you stand",
    body: (
      <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
        <StatTile
          value={currentFreeStreak(attacks, today, loggedDays)}
          label="days clear now"
          tone="accent"
        />
        <StatTile value={longestFreeStreak(attacks, loggedDays)} label="best clear run" />
        <StatTile value={attacks.length} label="attacks logged" />
      </View>
    ),
  });

  sections.push({
    key: "weekly",
    title: "Pain days by week",
    caption: "Last eight weeks. Two attacks in one day still count as one day.",
    body: <BarChart data={weekly} color={theme.colors.accent} height={130} />,
  });

  sections.push({
    key: "severity",
    title: "How bad they were",
    caption: "Peak severity of each attack, grouped in pairs.",
    body: (
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
        <DonutChart
          size={132}
          strokeWidth={17}
          segments={bands.map((band) => ({
            value: band.count,
            color: severityColor(theme, (band.bandIndex + 1) * 2),
          }))}
        />
        <View style={{ flex: 1, gap: 6 }}>
          {bands.map((band) => (
            <View
              key={band.label}
              style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: severityColor(theme, (band.bandIndex + 1) * 2),
                }}
              />
              <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption, flex: 1 }}>
                {band.label}
              </Text>
              <Text style={{ color: theme.colors.ink, ...theme.typography.caption }}>
                {band.count}
              </Text>
            </View>
          ))}
        </View>
      </View>
    ),
  });

  sections.push({
    key: "regions",
    title: "Where it hurts",
    caption:
      regions.length > 0
        ? `Most often: ${regionLabel(regions[0].region)} · ${regions[0].count} of ${attacks.length} attacks.`
        : "No areas marked yet.",
    body: <HeadDiagram size={168} intensities={regionIntensities} />,
  });

  sections.push({
    key: "clock",
    title: "When they start",
    caption: clock.reliable
      ? `Most starts cluster around ${formatClockHour(clock.summary!.meanHour)}.`
      : "Not clustered around one time of day yet.",
    body: (
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
        <OnsetClock
          bins={clock.bins}
          size={160}
          meanHour={clock.reliable ? clock.summary!.meanHour : null}
        />
        <View style={{ flex: 1, gap: theme.spacing.md }}>
          <StatTile
            value={durations.medianMinutes !== null ? formatDuration(durations.medianMinutes) : "—"}
            label="median length"
            animated={false}
            caption={`${durations.completed} closed`}
          />
          <StatTile
            value={
              durations.longestMinutes !== null ? formatDuration(durations.longestMinutes) : "—"
            }
            label="longest"
            animated={false}
            caption={durations.ongoing > 0 ? `${durations.ongoing} still open` : undefined}
          />
        </View>
      </View>
    ),
  });

  const medProgress = settings.medicationDayLimit
    ? meds.daysWithMedication / settings.medicationDayLimit
    : 0;

  sections.push({
    key: "meds",
    title: "Medication days",
    caption: `Days with any medication in the last 30 days, against the limit you set (${settings.medicationDayLimit}).`,
    body: (
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
        <AnimatedRing
          progress={medProgress}
          size={118}
          strokeWidth={13}
          color={medProgress >= 1 ? theme.colors.danger : theme.colors.accent}
          trackColor={theme.colors.surfaceAlt}
        >
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>
            {meds.daysWithMedication}
          </Text>
          <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>
            of {settings.medicationDayLimit}
          </Text>
        </AnimatedRing>
        <View style={{ flex: 1, gap: 6 }}>
          {meds.perMed.length > 0 ? (
            meds.perMed.map((entry) => (
              <View
                key={entry.medKey}
                style={{ flexDirection: "row", justifyContent: "space-between" }}
              >
                <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
                  {medLabel(entry.medKey)}
                </Text>
                <Text style={{ color: theme.colors.ink, ...theme.typography.caption }}>
                  {entry.days} {entry.days === 1 ? "day" : "days"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>
              No medication logged in this window.
            </Text>
          )}
        </View>
      </View>
    ),
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <PressableScale
            onPress={() => router.back()}
            scaleTo={0.9}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surface,
            }}
          >
            <ArrowLeft size={18} color={theme.colors.ink} />
          </PressableScale>
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>Stats</Text>
        </View>

        {attacks.length === 0 ? (
          <EmptyState
            title="No attacks logged yet"
            description="Charts appear as soon as the first attack is in the calendar."
          />
        ) : (
          sections.map((section, index) => (
            <Animated.View
              key={section.key}
              entering={FadeInDown.delay(staggerDelay(index)).duration(420)}
            >
              <Card style={{ marginBottom: theme.spacing.md }}>
                <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
                  {section.title}
                </Text>
                {section.caption ? (
                  <Text
                    style={{
                      color: theme.colors.inkMuted,
                      ...theme.typography.caption,
                      marginTop: 2,
                      marginBottom: theme.spacing.md,
                    }}
                  >
                    {section.caption}
                  </Text>
                ) : (
                  <View style={{ height: theme.spacing.md }} />
                )}
                {section.body}
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

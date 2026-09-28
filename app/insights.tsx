import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, Link2, Timer } from "lucide-react-native";
import { useAppTheme } from "../src/theme/useAppTheme";
import { staggerDelay } from "../src/theme/motion";
import {
  formatClockHour,
  formatDuration,
  weekdayNameByIndex,
  type DayIso,
} from "../src/lib/dates";
import { headacheDays, onsetHours, type Attack } from "../src/lib/episodes";
import {
  analyzeFactors,
  entangledPairs,
  readiness,
  type AnalysisInput,
  type FactorResult,
} from "../src/lib/triggers";
import { compareMeds, earlyVsLateDosing } from "../src/lib/medication";
import { onsetClock, weekdayAnalysis } from "../src/lib/rhythm";
import { FACTORS, factorLabel, medLabel } from "../src/lib/presets";
import { percent } from "../src/lib/statsMath";
import { listAttacks } from "../src/data/attacks";
import { listFactorsByDay, listLoggedDays } from "../src/data/days";
import { Card } from "../src/components/Card";
import { Chip } from "../src/components/Chip";
import { AnimatedRing } from "../src/components/AnimatedRing";
import { PressableScale } from "../src/components/PressableScale";

// Экран выводов. Каждое утверждение здесь — описание собственного журнала
// пользователя, с числом наблюдений и интервалом рядом. Никаких советов
// ("принимайте раньше", "избегайте X") — приложение описывает данные, а
// решения остаются за человеком и его врачом.

function RateBar({
  label,
  rate,
  count,
  total,
  color,
}: {
  label: string;
  rate: number;
  count: number;
  total: number;
  color: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ marginTop: theme.spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>{label}</Text>
        <Text style={{ color: theme.colors.ink, ...theme.typography.caption }}>
          {percent(rate)} · {count}/{total} days
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.colors.surfaceAlt,
          marginTop: 4,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.round(rate * 100)}%`,
            height: "100%",
            borderRadius: 4,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

function FindingCard({ result }: { result: Extract<FactorResult, { status: "finding" }> }) {
  const theme = useAppTheme();
  const finding = result.finding;
  const stronger = finding.difference > 0;
  const lagLabel = finding.lag === 0 ? "same day" : "next day";

  return (
    <Card style={{ marginBottom: theme.spacing.md }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
          {factorLabel(finding.factorKey)}
        </Text>
        <Chip label={lagLabel} tone="accent" />
      </View>

      <Text
        style={{
          color: theme.colors.inkMuted,
          ...theme.typography.caption,
          marginTop: theme.spacing.xs,
        }}
      >
        {finding.separated
          ? `${stronger ? "More" : "Fewer"} pain days ${lagLabel} after this was marked.`
          : "Direction is not separated from chance in your log yet."}
      </Text>

      <RateBar
        label="Marked"
        rate={finding.exposedRate}
        count={finding.exposedPainDays}
        total={finding.exposedDays}
        color={theme.colors.accent}
      />
      <RateBar
        label="Not marked"
        rate={finding.unexposedRate}
        count={finding.unexposedPainDays}
        total={finding.unexposedDays}
        color={theme.colors.inkFaint}
      />

      <Text
        style={{
          color: finding.separated ? theme.colors.ink : theme.colors.inkFaint,
          ...theme.typography.caption,
          marginTop: theme.spacing.sm,
        }}
      >
        Difference {finding.difference >= 0 ? "+" : ""}
        {percent(finding.difference)} · 95% range {percent(finding.differenceInterval.low)} to{" "}
        {percent(finding.differenceInterval.high)}
      </Text>
    </Card>
  );
}

export default function InsightsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [loggedDays, setLoggedDays] = useState<DayIso[]>([]);
  const [factorsByDay, setFactorsByDay] = useState<Map<DayIso, string[]>>(new Map());

  const load = useCallback(() => {
    Promise.all([listAttacks(), listLoggedDays(), listFactorsByDay()]).then(
      ([loadedAttacks, days, factors]) => {
        setAttacks(loadedAttacks);
        setLoggedDays(days);
        setFactorsByDay(factors);
      }
    );
  }, []);

  useFocusEffect(load);

  const input: AnalysisInput = useMemo(
    () => ({ loggedDays, factorsByDay, painDays: headacheDays(attacks) }),
    [loggedDays, factorsByDay, attacks]
  );

  const state = useMemo(() => readiness(loggedDays), [loggedDays]);
  const results = useMemo(
    () => analyzeFactors(FACTORS.map((factor) => factor.key), input),
    [input]
  );
  const findings = results.filter(
    (result): result is Extract<FactorResult, { status: "finding" }> => result.status === "finding"
  );
  const pending = results.filter((result) => result.status === "needsMoreData");
  const pairs = useMemo(() => entangledPairs(input), [input]);
  const medComparisons = useMemo(() => compareMeds(attacks).filter((entry) => entry.reliable), [attacks]);
  const timing = useMemo(() => earlyVsLateDosing(attacks), [attacks]);
  const weekdays = useMemo(
    () => weekdayAnalysis(loggedDays, headacheDays(attacks)),
    [loggedDays, attacks]
  );
  const clock = useMemo(() => onsetClock(onsetHours(attacks)), [attacks]);

  let delay = 0;
  const nextDelay = () => staggerDelay(delay++);

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
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>Insights</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(nextDelay()).duration(420)}>
          <Card style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
              <AnimatedRing
                progress={Math.min(1, state.loggedDays / 14)}
                size={96}
                strokeWidth={11}
                color={theme.colors.accent}
                trackColor={theme.colors.surfaceAlt}
              >
                <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
                  {state.loggedDays}
                </Text>
                <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>
                  days
                </Text>
              </AnimatedRing>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
                  {state.ready ? "Enough to compare" : "Still collecting"}
                </Text>
                <Text
                  style={{
                    color: theme.colors.inkMuted,
                    ...theme.typography.caption,
                    marginTop: 4,
                  }}
                >
                  {state.ready
                    ? "Everything below is counted from your own logged days, including the quiet ones."
                    : `${state.missingDays} more logged days before comparisons mean much. Days without an attack count too.`}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {findings.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(nextDelay()).duration(420)}>
            <Text
              style={{
                color: theme.colors.inkMuted,
                ...theme.typography.label,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: theme.spacing.sm,
              }}
            >
              Factors vs pain days
            </Text>
          </Animated.View>
        ) : null}

        {findings.map((result) => (
          <Animated.View
            key={result.factorKey}
            entering={FadeInDown.delay(nextDelay()).duration(420)}
          >
            <FindingCard result={result} />
          </Animated.View>
        ))}

        {pairs.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(nextDelay()).duration(420)}>
            <Card style={{ marginBottom: theme.spacing.md }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}
              >
                <Link2 size={16} color={theme.colors.inkMuted} />
                <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
                  Tangled together
                </Text>
              </View>
              <Text
                style={{
                  color: theme.colors.inkMuted,
                  ...theme.typography.caption,
                  marginTop: theme.spacing.xs,
                  marginBottom: theme.spacing.sm,
                }}
              >
                These are marked on almost the same days, so this log cannot tell them apart.
              </Text>
              {pairs.slice(0, 4).map((pair) => (
                <View
                  key={`${pair.factorA}-${pair.factorB}`}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: theme.colors.ink, ...theme.typography.caption, flex: 1 }}>
                    {factorLabel(pair.factorA)} + {factorLabel(pair.factorB)}
                  </Text>
                  <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
                    {pair.sharedDays} shared days
                  </Text>
                </View>
              ))}
            </Card>
          </Animated.View>
        ) : null}

        {medComparisons.length > 0 || timing.reliable ? (
          <Animated.View entering={FadeInDown.delay(nextDelay()).duration(420)}>
            <Card style={{ marginBottom: theme.spacing.md }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}
              >
                <Timer size={16} color={theme.colors.inkMuted} />
                <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
                  After medication
                </Text>
              </View>
              <Text
                style={{
                  color: theme.colors.inkMuted,
                  ...theme.typography.caption,
                  marginTop: theme.spacing.xs,
                  marginBottom: theme.spacing.sm,
                }}
              >
                Time from the dose to the end of the attack, counted only where one medication was
                logged and the attack was closed.
              </Text>

              {medComparisons.map((entry) => (
                <View
                  key={entry.medKey}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: theme.colors.ink, ...theme.typography.caption, flex: 1 }}>
                    {medLabel(entry.medKey)}
                  </Text>
                  <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
                    {entry.medianReliefMinutes !== null
                      ? formatDuration(entry.medianReliefMinutes)
                      : "—"}{" "}
                    · {entry.comparable} attacks
                    {entry.censored > 0 ? ` · ${entry.censored} open` : ""}
                  </Text>
                </View>
              ))}

              {timing.reliable ? (
                <Text
                  style={{
                    color: theme.colors.ink,
                    ...theme.typography.caption,
                    marginTop: theme.spacing.sm,
                  }}
                >
                  Doses within 30 minutes of onset were followed by{" "}
                  {formatDuration(timing.earlyMedianMinutes ?? 0)} of pain ({timing.earlyCount}{" "}
                  attacks); later doses by {formatDuration(timing.lateMedianMinutes ?? 0)} (
                  {timing.lateCount} attacks).
                </Text>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        {weekdays.standout || clock.reliable ? (
          <Animated.View entering={FadeInDown.delay(nextDelay()).duration(420)}>
            <Card style={{ marginBottom: theme.spacing.md }}>
              <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>Rhythm</Text>
              {weekdays.standout ? (
                <Text
                  style={{
                    color: theme.colors.inkMuted,
                    ...theme.typography.caption,
                    marginTop: theme.spacing.sm,
                  }}
                >
                  {weekdayNameByIndex(weekdays.standout.weekday)}s carry{" "}
                  {percent(weekdays.standout.rate)} pain days against{" "}
                  {percent(weekdays.overallRate)} overall ({weekdays.standout.painDays} of{" "}
                  {weekdays.standout.loggedDays} logged).
                </Text>
              ) : null}
              {clock.reliable && clock.peakWindow ? (
                <Text
                  style={{
                    color: theme.colors.inkMuted,
                    ...theme.typography.caption,
                    marginTop: theme.spacing.sm,
                  }}
                >
                  Attacks tend to start between {formatClockHour(clock.peakWindow.fromHour)} and{" "}
                  {formatClockHour(clock.peakWindow.toHour)}.
                </Text>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        {pending.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(nextDelay()).duration(420)}>
            <Card style={{ marginBottom: theme.spacing.md }}>
              <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
                Not enough days yet
              </Text>
              <Text
                style={{
                  color: theme.colors.inkMuted,
                  ...theme.typography.caption,
                  marginTop: theme.spacing.xs,
                  marginBottom: theme.spacing.sm,
                }}
              >
                Marked a few times, but too rarely to compare against the rest.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {pending.map((result) => (
                  <Chip
                    key={result.factorKey}
                    label={`${factorLabel(result.factorKey)} · ${
                      result.status === "needsMoreData" ? result.exposedDays : 0
                    }`}
                  />
                ))}
              </View>
            </Card>
          </Animated.View>
        ) : null}

        <Text
          style={{
            color: theme.colors.inkFaint,
            ...theme.typography.caption,
            textAlign: "center",
            marginTop: theme.spacing.sm,
          }}
        >
          HeadMap describes your own log. It does not diagnose and gives no treatment advice.
        </Text>
      </ScrollView>
    </View>
  );
}

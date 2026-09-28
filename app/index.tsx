import { useCallback, useMemo, useState } from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronLeft, ChevronRight, ChartNoAxesColumn, Settings, Sparkles } from "lucide-react-native";
import { useAppTheme } from "../src/theme/useAppTheme";
import { staggerDelay } from "../src/theme/motion";
import { severityRamp } from "../src/theme/dataviz";
import {
  WEEKDAY_INITIALS,
  monthGrid,
  monthLabel,
  shiftMonth,
  todayIso,
  type DayIso,
} from "../src/lib/dates";
import { attacksOnDay, currentFreeStreak, monthSummary, type Attack } from "../src/lib/episodes";
import { listAttacks } from "../src/data/attacks";
import { getDayFactors, listFactorsByDay, listLoggedDays } from "../src/data/days";
import { DayDial } from "../src/components/DayDial";
import { DaySheet } from "../src/components/DaySheet";
import { AttackSheet } from "../src/components/AttackSheet";
import { FactorsSheet } from "../src/components/FactorsSheet";
import { StatTile } from "../src/components/StatTile";
import { PressableScale } from "../src/components/PressableScale";

// Layout-архетип — Calendar-first: месяц и есть главный экран, отдельного FAB
// нет, добавление всегда начинается с тапа по дню (дата уже подставлена).
// Навигация — три иконки в компактном хедере, без нижнего таб-бара.

export default function CalendarScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const today = todayIso();
  const [anchor, setAnchor] = useState<DayIso>(today);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [loggedDays, setLoggedDays] = useState<DayIso[]>([]);
  const [factorsByDay, setFactorsByDay] = useState<Map<DayIso, string[]>>(new Map());

  const [selectedDay, setSelectedDay] = useState<DayIso | null>(null);
  const [daySheet, setDaySheet] = useState(false);
  const [attackSheet, setAttackSheet] = useState(false);
  const [factorsSheet, setFactorsSheet] = useState(false);
  const [editing, setEditing] = useState<Attack | null>(null);
  const [dayFactors, setDayFactors] = useState<string[]>([]);

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

  const cells = useMemo(() => monthGrid(anchor), [anchor]);
  const summary = useMemo(
    () => monthSummary(attacks, loggedDays, anchor.slice(0, 7)),
    [attacks, loggedDays, anchor]
  );
  const streak = useMemo(() => currentFreeStreak(attacks, today), [attacks, today]);
  const loggedSet = useMemo(() => new Set(loggedDays), [loggedDays]);

  const cellSize = Math.floor((Dimensions.get("window").width - theme.spacing.lg * 2 - 6 * 4) / 7);

  const openDay = async (day: DayIso) => {
    setSelectedDay(day);
    setDayFactors(await getDayFactors(day));
    setDaySheet(true);
  };

  const refreshDay = async () => {
    load();
    if (selectedDay) setDayFactors(await getDayFactors(selectedDay));
  };

  const navButtons = [
    { key: "insights", icon: Sparkles, href: "/insights" as const },
    { key: "stats", icon: ChartNoAxesColumn, href: "/stats" as const },
    { key: "settings", icon: Settings, href: "/settings" as const },
  ];

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
            justifyContent: "space-between",
            marginBottom: theme.spacing.lg,
          }}
        >
          <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>HeadMap</Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {navButtons.map(({ key, icon: Icon, href }) => (
              <PressableScale
                key={key}
                onPress={() => router.push(href)}
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
                <Icon size={18} color={theme.colors.ink} />
              </PressableScale>
            ))}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.md,
          }}
        >
          <PressableScale
            onPress={() => setAnchor(shiftMonth(anchor, -1))}
            scaleTo={0.9}
            style={{ padding: theme.spacing.sm }}
          >
            <ChevronLeft size={22} color={theme.colors.inkMuted} />
          </PressableScale>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>
              {monthLabel(anchor)}
            </Text>
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.caption }}>
              {summary.painDays} pain {summary.painDays === 1 ? "day" : "days"} ·{" "}
              {summary.loggedDays} logged
            </Text>
          </View>
          <PressableScale
            onPress={() => setAnchor(shiftMonth(anchor, 1))}
            scaleTo={0.9}
            style={{ padding: theme.spacing.sm }}
          >
            <ChevronRight size={22} color={theme.colors.inkMuted} />
          </PressableScale>
        </View>

        <View style={{ flexDirection: "row", marginBottom: theme.spacing.xs }}>
          {WEEKDAY_INITIALS.map((initial, index) => (
            <Text
              key={index}
              style={{
                flex: 1,
                textAlign: "center",
                color: theme.colors.inkFaint,
                ...theme.typography.caption,
              }}
            >
              {initial}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {cells.map((cell, index) => (
            <Animated.View
              key={cell.day}
              entering={FadeInDown.delay(staggerDelay(Math.floor(index / 7), 45)).duration(340)}
            >
              <DayDial
                day={cell.day}
                attacks={attacksOnDay(attacks, cell.day)}
                inMonth={cell.inMonth}
                isToday={cell.day === today}
                isSelected={cell.day === selectedDay}
                isLogged={loggedSet.has(cell.day)}
                size={cellSize}
                onPress={openDay}
              />
            </Animated.View>
          ))}
        </View>

        <Animated.View
          entering={FadeInDown.delay(260).duration(420)}
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            marginTop: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <StatTile value={streak} label="days clear" suffix={streak === 1 ? "day" : ""} />
          <StatTile
            value={summary.attacks}
            label="attacks this month"
            caption={
              summary.averageSeverity !== null
                ? `avg ${summary.averageSeverity.toFixed(1)}/10`
                : "nothing logged yet"
            }
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(320).duration(420)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.md,
            paddingHorizontal: theme.spacing.xs,
          }}
        >
          <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>Mild</Text>
          <View style={{ flexDirection: "row", flex: 1, gap: 3 }}>
            {severityRamp(theme).map((color) => (
              <View
                key={color}
                style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: color }}
              />
            ))}
          </View>
          <Text style={{ color: theme.colors.inkFaint, ...theme.typography.caption }}>Severe</Text>
        </Animated.View>

        <Text
          style={{
            color: theme.colors.inkFaint,
            ...theme.typography.caption,
            marginTop: theme.spacing.sm,
            textAlign: "center",
          }}
        >
          Each ring is one day, midnight at the top. Tap a day to log.
        </Text>
      </ScrollView>

      {selectedDay ? (
        <>
          <DaySheet
            visible={daySheet}
            day={selectedDay}
            attacks={attacksOnDay(attacks, selectedDay)}
            factors={dayFactors}
            onClose={() => setDaySheet(false)}
            onAddAttack={() => {
              setEditing(null);
              setDaySheet(false);
              setAttackSheet(true);
            }}
            onEditAttack={(attack) => {
              setEditing(attack);
              setDaySheet(false);
              setAttackSheet(true);
            }}
            onEditFactors={() => {
              setDaySheet(false);
              setFactorsSheet(true);
            }}
          />
          <AttackSheet
            visible={attackSheet}
            day={selectedDay}
            attack={editing}
            onClose={() => setAttackSheet(false)}
            onSaved={refreshDay}
          />
          <FactorsSheet
            visible={factorsSheet}
            day={selectedDay}
            initialFactors={dayFactors}
            onClose={() => setFactorsSheet(false)}
            onSaved={refreshDay}
          />
        </>
      ) : null}
    </View>
  );
}

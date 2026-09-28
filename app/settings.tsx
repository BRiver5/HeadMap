import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, Minus, Plus } from "lucide-react-native";
import { useAppTheme } from "../src/theme/useAppTheme";
import { staggerDelay } from "../src/theme/motion";
import { useUiStore, type SchemePreference } from "../src/store/uiStore";
import { haptics } from "../src/services/haptics";
import { cancelAll, requestNotificationPermission, scheduleDaily } from "../src/services/notifications";
import { DEFAULT_SETTINGS, loadSettings, saveSetting, type AppSettings } from "../src/data/settings";
import { clearAllData } from "../src/data/days";
import { Card } from "../src/components/Card";
import { Chip } from "../src/components/Chip";
import { Toggle } from "../src/components/Toggle";
import { PressableScale } from "../src/components/PressableScale";

const SCHEMES: { key: SchemePreference; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

const REMINDER_ID = "headmap-daily-check-in";

export default function SettingsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setSchemePreference = useUiStore((state) => state.setSchemePreference);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const load = useCallback(() => {
    loadSettings().then(setSettings);
  }, []);

  useFocusEffect(load);

  const update = async (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    for (const [key, value] of Object.entries(patch)) {
      await saveSetting(key as keyof AppSettings, value as string | number | boolean);
    }
    return next;
  };

  const changeScheme = async (preference: SchemePreference) => {
    haptics.tap();
    setSchemePreference(preference);
    await update({ schemePreference: preference });
  };

  // Напоминание нужно не "чтобы вернуть пользователя в приложение", а потому
  // что без отмеченных спокойных дней анализ на Insights не с чем сравнивать.
  const toggleReminder = async (enabled: boolean) => {
    if (!enabled) {
      await cancelAll();
      await update({ reminderEnabled: false });
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        "Notifications are off",
        "Allow notifications for HeadMap in system settings to get the daily check-in."
      );
      return;
    }
    await scheduleDaily({
      id: REMINDER_ID,
      hour: settings.reminderHour,
      minute: settings.reminderMinute,
      title: "How was today?",
      body: "Mark today's factors — quiet days count too.",
    });
    await update({ reminderEnabled: true });
  };

  const shiftReminderHour = async (amount: number) => {
    haptics.tap();
    const hour = (settings.reminderHour + amount + 24) % 24;
    const next = await update({ reminderHour: hour });
    if (next.reminderEnabled) {
      await scheduleDaily({
        id: REMINDER_ID,
        hour,
        minute: next.reminderMinute,
        title: "How was today?",
        body: "Mark today's factors — quiet days count too.",
      });
    }
  };

  const shiftLimit = async (amount: number) => {
    haptics.tap();
    await update({
      medicationDayLimit: Math.min(30, Math.max(1, settings.medicationDayLimit + amount)),
    });
  };

  const confirmReset = () => {
    Alert.alert("Delete everything?", "All attacks, day factors and settings history are removed.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await clearAllData();
          haptics.warning();
          router.replace("/");
        },
      },
    ]);
  };

  const Stepper = ({ onMinus, onPlus, value }: { onMinus: () => void; onPlus: () => void; value: string }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
      <PressableScale
        onPress={onMinus}
        scaleTo={0.88}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Minus size={16} color={theme.colors.ink} />
      </PressableScale>
      <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle, minWidth: 54, textAlign: "center" }}>
        {value}
      </Text>
      <PressableScale
        onPress={onPlus}
        scaleTo={0.88}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Plus size={16} color={theme.colors.ink} />
      </PressableScale>
    </View>
  );

  const sections = [
    {
      key: "appearance",
      title: "Appearance",
      caption: "Dark mode is here for the days when light is the problem.",
      body: (
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          {SCHEMES.map((scheme) => (
            <Chip
              key={scheme.key}
              label={scheme.label}
              selected={settings.schemePreference === scheme.key}
              onPress={() => changeScheme(scheme.key)}
            />
          ))}
        </View>
      ),
    },
    {
      key: "reminder",
      title: "Daily check-in",
      caption: "A nudge to mark the day — including the days nothing happened.",
      body: (
        <View style={{ gap: theme.spacing.md }}>
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <Text style={{ color: theme.colors.ink, ...theme.typography.body }}>Remind me</Text>
            <Toggle value={settings.reminderEnabled} onValueChange={toggleReminder} />
          </View>
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <Text style={{ color: theme.colors.inkMuted, ...theme.typography.body }}>At</Text>
            <Stepper
              onMinus={() => shiftReminderHour(-1)}
              onPlus={() => shiftReminderHour(1)}
              value={`${String(settings.reminderHour).padStart(2, "0")}:${String(
                settings.reminderMinute
              ).padStart(2, "0")}`}
            />
          </View>
        </View>
      ),
    },
    {
      key: "limit",
      title: "Medication day limit",
      caption:
        "Your own reference number. Stats counts days with any medication in the last 30 and shows them against it.",
      body: (
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ color: theme.colors.ink, ...theme.typography.body }}>Days per 30</Text>
          <Stepper
            onMinus={() => shiftLimit(-1)}
            onPlus={() => shiftLimit(1)}
            value={String(settings.medicationDayLimit)}
          />
        </View>
      ),
    },
    {
      key: "data",
      title: "Your data",
      caption: "Everything stays on this device. No account, no sync, no analytics.",
      body: (
        <PressableScale
          onPress={confirmReset}
          style={{
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.danger,
            paddingVertical: theme.spacing.md,
            alignItems: "center",
          }}
        >
          <Text style={{ color: theme.colors.danger, ...theme.typography.body }}>
            Delete all data
          </Text>
        </PressableScale>
      ),
    },
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
          <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>Settings</Text>
        </View>

        {sections.map((section, index) => (
          <Animated.View
            key={section.key}
            entering={FadeInDown.delay(staggerDelay(index)).duration(420)}
          >
            <Card style={{ marginBottom: theme.spacing.md }}>
              <Text style={{ color: theme.colors.ink, ...theme.typography.subtitle }}>
                {section.title}
              </Text>
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
              {section.body}
            </Card>
          </Animated.View>
        ))}

        <Text
          style={{
            color: theme.colors.inkFaint,
            ...theme.typography.caption,
            textAlign: "center",
          }}
        >
          HeadMap is a personal log. It does not diagnose conditions and gives no treatment advice.
        </Text>
      </ScrollView>
    </View>
  );
}

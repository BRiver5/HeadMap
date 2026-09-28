import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Clock, Trash2 } from "lucide-react-native";
import { useAppTheme } from "../theme/useAppTheme";
import { staggerDelay } from "../theme/motion";
import { haptics } from "../services/haptics";
import { addMinutes, dayLabel, minutesBetween, nowStamp, timeOf, type DayIso, type StampIso } from "../lib/dates";
import { MEDS, type RegionKey } from "../lib/presets";
import type { Attack } from "../lib/episodes";
import { deleteAttack, saveAttack } from "../data/attacks";
import { SheetModal } from "./SheetModal";
import { SeverityScale } from "./SeverityScale";
import { HeadDiagram } from "./HeadDiagram";
import { TimeStepper } from "./TimeStepper";
import { Chip } from "./Chip";
import { PrimaryButton } from "./PrimaryButton";
import { SecondaryButton } from "./SecondaryButton";
import { SuccessBurst } from "./SuccessBurst";
import { PressableScale } from "./PressableScale";

type DoseDraft = { medKey: string; takenAt: StampIso };

function defaultStart(day: DayIso): StampIso {
  const now = nowStamp();
  return now.slice(0, 10) === day ? now : `${day}T09:00`;
}

export function AttackSheet({
  visible,
  day,
  attack,
  onClose,
  onSaved,
}: {
  visible: boolean;
  day: DayIso;
  attack: Attack | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useAppTheme();
  const [startedAt, setStartedAt] = useState<StampIso>(defaultStart(day));
  const [endedAt, setEndedAt] = useState<StampIso | null>(null);
  const [severity, setSeverity] = useState(5);
  const [regions, setRegions] = useState<RegionKey[]>([]);
  const [doses, setDoses] = useState<DoseDraft[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStartedAt(attack?.startedAt ?? defaultStart(day));
    setEndedAt(attack?.endedAt ?? null);
    setSeverity(attack?.severity ?? 5);
    setRegions(attack?.regions ?? []);
    setDoses(attack?.doses.map((dose) => ({ medKey: dose.medKey, takenAt: dose.takenAt })) ?? []);
    setNote(attack?.note ?? "");
    setBurst(false);
  }, [visible, attack, day]);

  const toggleRegion = (region: RegionKey) =>
    setRegions((current) =>
      current.includes(region) ? current.filter((entry) => entry !== region) : [...current, region]
    );

  const toggleMed = (medKey: string) =>
    setDoses((current) =>
      current.some((dose) => dose.medKey === medKey)
        ? current.filter((dose) => dose.medKey !== medKey)
        : [...current, { medKey, takenAt: addMinutes(startedAt, 15) }]
    );

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    // Конец раньше начала — не ошибка ввода, а частый случай "закончилось после
    // полуночи": сдвигаем на следующие сутки, а не браним пользователя.
    const normalizedEnd =
      endedAt && minutesBetween(startedAt, endedAt) < 0 ? addMinutes(endedAt, 24 * 60) : endedAt;
    await saveAttack({
      id: attack?.id,
      startedAt,
      endedAt: normalizedEnd,
      severity,
      note: note.trim() ? note.trim() : null,
      regions,
      doses,
    });
    haptics.success();
    setSaving(false);
    setBurst(true);
  };

  const remove = async () => {
    if (!attack) return;
    haptics.warning();
    await deleteAttack(attack.id);
    onSaved();
    onClose();
  };

  const sections: { key: string; render: () => React.ReactNode }[] = [
    {
      key: "time",
      render: () => (
        <View style={{ gap: theme.spacing.sm }}>
          <TimeStepper label="Started" value={startedAt} onChange={setStartedAt} />
          {endedAt ? (
            <TimeStepper label="Ended" value={endedAt} onChange={setEndedAt} />
          ) : null}
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <Chip
              label="Set to now"
              onPress={() => setStartedAt(nowStamp())}
              trailing={<Clock size={14} color={theme.colors.inkMuted} />}
            />
            <Chip
              label={endedAt ? "Still going" : "It has ended"}
              selected={Boolean(endedAt)}
              onPress={() => setEndedAt(endedAt ? null : addMinutes(startedAt, 120))}
            />
          </View>
        </View>
      ),
    },
    {
      key: "severity",
      render: () => <SeverityScale value={severity} onChange={setSeverity} />,
    },
    {
      key: "regions",
      render: () => (
        <HeadDiagram size={172} selected={regions} onToggleRegion={toggleRegion} />
      ),
    },
    {
      key: "meds",
      render: () => (
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {MEDS.map((med) => (
              <Chip
                key={med.key}
                label={med.label}
                selected={doses.some((dose) => dose.medKey === med.key)}
                onPress={() => toggleMed(med.key)}
              />
            ))}
          </View>
          {doses.map((dose) => (
            <TimeStepper
              key={dose.medKey}
              label={`${MEDS.find((med) => med.key === dose.medKey)?.label ?? dose.medKey} taken at`}
              value={dose.takenAt}
              onChange={(value) =>
                setDoses((current) =>
                  current.map((entry) =>
                    entry.medKey === dose.medKey ? { ...entry, takenAt: value } : entry
                  )
                )
              }
            />
          ))}
        </View>
      ),
    },
    {
      key: "note",
      render: () => (
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Anything else worth remembering"
          placeholderTextColor={theme.colors.inkFaint}
          multiline
          style={{
            minHeight: 68,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceAlt,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            color: theme.colors.ink,
            textAlignVertical: "top",
            ...theme.typography.body,
          }}
        />
      ),
    },
  ];

  const titles: Record<string, string> = {
    time: "When",
    severity: "How bad",
    regions: "Where",
    meds: "Medication",
    note: "Note",
  };

  return (
    <SheetModal
      visible={visible}
      title={attack ? "Edit attack" : "Log attack"}
      subtitle={dayLabel(day)}
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {sections.map((section, index) => (
          <Animated.View
            key={section.key}
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
              {titles[section.key]}
            </Text>
            {section.render()}
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
          <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
            <PrimaryButton
              label={attack ? "Save changes" : `Save attack · ${timeOf(startedAt)}`}
              onPress={submit}
              disabled={saving}
            />
            {attack ? (
              <PressableScale
                onPress={remove}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: theme.spacing.xs,
                  paddingVertical: theme.spacing.md,
                }}
              >
                <Trash2 size={16} color={theme.colors.danger} />
                <Text style={{ color: theme.colors.danger, ...theme.typography.body }}>
                  Delete this attack
                </Text>
              </PressableScale>
            ) : (
              <SecondaryButton label="Cancel" onPress={onClose} />
            )}
          </View>
        ) : null}
      </ScrollView>
    </SheetModal>
  );
}

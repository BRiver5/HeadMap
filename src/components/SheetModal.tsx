import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/useAppTheme";
import { PressableScale } from "./PressableScale";

// Шторка снизу для всех форм приложения. Добавление записи в HeadMap всегда
// идёт через явный триггер (кнопка/тап по дню) и открытие этой шторки — тихих
// инлайн-форм, которые "просто отправляются", в приложении нет.

export function SheetModal({
  visible,
  title,
  subtitle,
  onClose,
  children,
  maxHeightRatio = 0.92,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightRatio?: number;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(theme.motion.duration.base)}
        style={{ flex: 1, backgroundColor: "rgba(20, 16, 24, 0.45)", justifyContent: "flex-end" }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(theme.motion.duration.slow)}
          style={{
            maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: theme.spacing.lg,
            }}
          >
            <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
              <Text style={{ color: theme.colors.ink, ...theme.typography.title }}>{title}</Text>
              {subtitle ? (
                <Text
                  style={{
                    color: theme.colors.inkMuted,
                    ...theme.typography.caption,
                    marginTop: 2,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <PressableScale
              onPress={onClose}
              scaleTo={0.9}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.surfaceAlt,
              }}
            >
              <X size={18} color={theme.colors.inkMuted} />
            </PressableScale>
          </View>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

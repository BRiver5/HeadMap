import { Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { useAppTheme } from "../theme/useAppTheme";
import { regionHeatColor } from "../theme/dataviz";
import { REGIONS, type RegionKey } from "../lib/presets";
import { haptics } from "../services/haptics";

// Сигнатурный виджет HeadMap: схема головы с зонами боли. В форме приступа по
// ней тапают ("где болело"), на экране Stats та же схема закрашивается
// частотой по зонам. Ни ring, ни heatmap-сетки в портфеле это не повторяет —
// вся суть в том, что цвет лежит на анатомии, а не на абстрактной шкале.
//
// Координаты — в системе viewBox 120×150, поэтому виджет масштабируется одним
// пропом size без пересчёта чисел.

type Props = {
  size?: number;
  selected?: RegionKey[];
  intensities?: Partial<Record<RegionKey, number>>;
  onToggleRegion?: (region: RegionKey) => void;
};

const ZONE_LABEL_ROWS: RegionKey[][] = [
  ["crown", "forehead"],
  ["leftTemple", "rightTemple"],
  ["leftEye", "rightEye"],
  ["backOfHead", "neck"],
];

export function HeadDiagram({ size = 180, selected = [], intensities, onToggleRegion }: Props) {
  const theme = useAppTheme();
  const interactive = Boolean(onToggleRegion);
  const height = (size * 150) / 120;

  // Невыбранная зона красится в backgroundAlt, а не в surfaceAlt: схема живёт
  // и на шторке (фон background), и на карточке Stats (фон surface), и на
  // первой из них surfaceAlt практически совпадал с фоном — зоны пропадали.
  const fillFor = (region: RegionKey): string => {
    if (intensities) return regionHeatColor(theme, intensities[region] ?? 0);
    return selected.includes(region) ? theme.colors.accent : theme.colors.backgroundAlt;
  };

  const strokeFor = (region: RegionKey): string =>
    selected.includes(region) ? theme.colors.accent : theme.colors.border;

  // Подпись внутри закрашенной зоны должна читаться и на акценте, и на светлой
  // заливке, и на тёмных ступенях тепловой шкалы.
  const labelInkFor = (region: RegionKey): string => {
    if (intensities) return (intensities[region] ?? 0) > 0.5 ? "#FFFFFF" : theme.colors.inkMuted;
    return selected.includes(region) ? theme.colors.onAccent : theme.colors.inkMuted;
  };

  const press = (region: RegionKey) => {
    if (!onToggleRegion) return;
    haptics.tap();
    onToggleRegion(region);
  };

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View entering={FadeIn.duration(theme.motion.duration.slow)}>
        <Svg width={size} height={height} viewBox="0 0 120 150">
          {/* силуэт головы и шеи — только подложка, зоны рисуются поверх */}
          <Rect x={50} y={96} width={20} height={26} rx={8} fill={theme.colors.surfaceAlt} />
          <Ellipse
            cx={60}
            cy={62}
            rx={38}
            ry={46}
            fill={theme.colors.surfaceAlt}
            stroke={theme.colors.border}
            strokeWidth={1.5}
          />

          {/* crown — верхняя шапка черепа */}
          <G onPress={() => press("crown")}>
            <Path
              d="M23 56 A38 46 0 0 1 97 56 Z"
              fill={fillFor("crown")}
              stroke={strokeFor("crown")}
              strokeWidth={1.5}
            />
          </G>

          {/* forehead — полоса лба */}
          <G onPress={() => press("forehead")}>
            <Rect
              x={34}
              y={57}
              width={52}
              height={17}
              rx={7}
              fill={fillFor("forehead")}
              stroke={strokeFor("forehead")}
              strokeWidth={1.5}
            />
          </G>

          {/* виски */}
          <G onPress={() => press("leftTemple")}>
            <Circle
              cx={28}
              cy={72}
              r={10}
              fill={fillFor("leftTemple")}
              stroke={strokeFor("leftTemple")}
              strokeWidth={1.5}
            />
          </G>
          <G onPress={() => press("rightTemple")}>
            <Circle
              cx={92}
              cy={72}
              r={10}
              fill={fillFor("rightTemple")}
              stroke={strokeFor("rightTemple")}
              strokeWidth={1.5}
            />
          </G>

          {/* за глазами */}
          <G onPress={() => press("leftEye")}>
            <Circle
              cx={47}
              cy={83}
              r={8}
              fill={fillFor("leftEye")}
              stroke={strokeFor("leftEye")}
              strokeWidth={1.5}
            />
          </G>
          <G onPress={() => press("rightEye")}>
            <Circle
              cx={73}
              cy={83}
              r={8}
              fill={fillFor("rightEye")}
              stroke={strokeFor("rightEye")}
              strokeWidth={1.5}
            />
          </G>

          {/* затылок — отдельная зона под схемой, иначе во фронтальном виде её
              некуда положить, не соврав анатомически. Обе нижние зоны подписаны
              прямо в SVG: без подписи это просто две безымянные пилюли */}
          <G onPress={() => press("backOfHead")}>
            <Rect
              x={8}
              y={126}
              width={48}
              height={18}
              rx={9}
              fill={fillFor("backOfHead")}
              stroke={strokeFor("backOfHead")}
              strokeWidth={1.5}
            />
            <SvgText
              x={32}
              y={138}
              fontSize={8}
              textAnchor="middle"
              fill={labelInkFor("backOfHead")}
            >
              Back
            </SvgText>
          </G>

          {/* шея */}
          <G onPress={() => press("neck")}>
            <Rect
              x={64}
              y={126}
              width={48}
              height={18}
              rx={9}
              fill={fillFor("neck")}
              stroke={strokeFor("neck")}
              strokeWidth={1.5}
            />
            <SvgText x={88} y={138} fontSize={8} textAnchor="middle" fill={labelInkFor("neck")}>
              Neck
            </SvgText>
          </G>
        </Svg>
      </Animated.View>

      <View style={{ marginTop: theme.spacing.sm, width: "100%" }}>
        {ZONE_LABEL_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row" }}>
            {row.map((key) => {
              const region = REGIONS.find((entry) => entry.key === key)!;
              const isActive = selected.includes(key);
              const value = intensities?.[key];
              return (
                <View
                  key={key}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.xs,
                    paddingVertical: 3,
                  }}
                >
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 3,
                      backgroundColor: intensities
                        ? regionHeatColor(theme, value ?? 0)
                        : isActive
                          ? theme.colors.accent
                          : theme.colors.border,
                    }}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      color:
                        isActive || (value ?? 0) > 0 ? theme.colors.ink : theme.colors.inkFaint,
                      ...theme.typography.caption,
                    }}
                  >
                    {region.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {interactive ? (
        <Text
          style={{
            color: theme.colors.inkFaint,
            ...theme.typography.caption,
            marginTop: theme.spacing.xs,
          }}
        >
          Tap the map to mark where it hurts
        </Text>
      ) : null}
    </View>
  );
}

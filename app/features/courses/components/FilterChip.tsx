import { Pressable, TextStyle, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { FilledTriangle } from "./FilledTriangle"

interface FilterChipProps {
  accessibilityLabel: string
  label: string
  onPress: () => void
  testID?: string
}

export function FilterChip({ accessibilityLabel, label, onPress, testID }: FilterChipProps) {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [themed($chip), pressed && $pressed]}
      testID={testID}
    >
      <Text text={label} size="xs" weight="semiBold" numberOfLines={1} style={$label} />
      <FilledTriangle
        color={colors.text}
        direction="down"
        testID={testID ? `${testID}-triangle` : undefined}
      />
    </Pressable>
  )
}

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 18,
  borderWidth: 1,
  flexDirection: "row",
  gap: spacing.xxs,
  minHeight: 44,
  paddingHorizontal: spacing.md,
  width: "100%",
})

const $label: TextStyle = {
  flex: 1,
  minWidth: 0,
}

const $pressed: ViewStyle = {
  opacity: 0.72,
}

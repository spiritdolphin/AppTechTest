import { Pressable, TextStyle, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface FilterChipProps {
  accessibilityLabel: string
  label: string
  onPress: () => void
}

export function FilterChip({ accessibilityLabel, label, onPress }: FilterChipProps) {
  const { themed } = useAppTheme()

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [themed($chip), pressed && $pressed]}
    >
      <Text text={label} size="xs" weight="semiBold" numberOfLines={1} style={$label} />
      <Text text="⌄" size="sm" accessibilityElementsHidden importantForAccessibility="no" />
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
})

const $label: TextStyle = {
  flexShrink: 1,
}

const $pressed: ViewStyle = {
  opacity: 0.72,
}

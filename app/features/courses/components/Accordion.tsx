import { PropsWithChildren, useState } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface AccordionProps extends PropsWithChildren {
  accessibilityLabel?: string
  initiallyExpanded?: boolean
  compact?: boolean
  title: string
}

export function Accordion({
  accessibilityLabel,
  children,
  initiallyExpanded = false,
  compact = false,
  title,
}: AccordionProps) {
  const { themed } = useAppTheme()
  const [expanded, setExpanded] = useState(initiallyExpanded)

  return (
    <View style={themed($container)}>
      <Pressable
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [themed($header), compact && $compactHeader, pressed && $pressed]}
      >
        <Text text={title} weight="semiBold" style={$title} />
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          text={expanded ? "−" : "+"}
          size="lg"
          style={themed($indicator)}
        />
      </Pressable>
      {expanded && <View style={themed($content)}>{children}</View>}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 18,
  borderWidth: 1,
  overflow: "hidden",
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flexDirection: "row",
  minHeight: 52,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $title: TextStyle = {
  flex: 1,
}

const $compactHeader: ViewStyle = { minHeight: 44, paddingVertical: 4 }

const $indicator: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $content: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopColor: colors.separator,
  borderTopWidth: 1,
  gap: spacing.sm,
  padding: spacing.md,
})

const $pressed: ViewStyle = {
  opacity: 0.72,
}

import { View, ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export function CourseCatalogueScreen() {
  const { themed } = useAppTheme()

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={themed($screenContent)}
    >
      <View style={themed($header)}>
        <Text tx="courseCatalogue:eyebrow" size="xs" weight="semiBold" />
        <Text tx="courseCatalogue:title" preset="heading" />
        <Text tx="courseCatalogue:subtitle" preset="subheading" />
      </View>

      <View style={themed($statusCard)} testID="course-catalogue-placeholder">
        <Text tx="courseCatalogue:statusTitle" weight="semiBold" />
        <Text tx="courseCatalogue:statusBody" size="sm" />
      </View>
    </Screen>
  )
}

const $screenContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.background,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.xl,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $statusCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderColor: colors.border,
  borderRadius: 20,
  borderWidth: 1,
  gap: spacing.xs,
  marginTop: spacing.xxl,
  padding: spacing.lg,
})

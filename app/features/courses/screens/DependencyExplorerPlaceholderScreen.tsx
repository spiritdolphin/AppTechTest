import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export function DependencyExplorerPlaceholderScreen({
  navigation,
  route,
}: AppStackScreenProps<"DependencyExplorer">) {
  const { themed } = useAppTheme()
  const { courseCode } = route.params

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={themed($screenContent)}
    >
      <Pressable
        accessibilityLabel={`Back to ${courseCode} details`}
        accessibilityRole="button"
        onPress={navigation.goBack}
        style={({ pressed }) => [themed($backButton), pressed && $pressed]}
      >
        <Text text="‹" size="xl" style={themed($backIcon)} />
        <Text text="Course Details" weight="semiBold" />
      </Pressable>

      <View style={themed($content)}>
        <Text text="DEPENDENCY EXPLORER" size="xs" weight="semiBold" style={themed($eyebrow)} />
        <Text text={courseCode} preset="heading" />
        <Text text="Coming in the next milestone" preset="subheading" style={$centerText} />
        <Text
          text="This navigation seam is ready. Prerequisite parsing and the interactive dependency view will be implemented as milestone 5."
          style={[themed($secondaryText), $centerText]}
        />
      </View>
    </Screen>
  )
}

const $screenContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  flex: 1,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
})

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  alignSelf: "flex-start",
  flexDirection: "row",
  minHeight: 44,
  paddingRight: spacing.sm,
})

const $backIcon: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginRight: spacing.xxs,
})

const $content: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  alignSelf: "stretch",
  backgroundColor: colors.palette.neutral100,
  borderRadius: 24,
  gap: spacing.md,
  justifyContent: "center",
  marginTop: spacing.xxl,
  minHeight: 360,
  padding: spacing.xl,
})

const $eyebrow: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 1.1,
})

const $secondaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $centerText: TextStyle = {
  textAlign: "center",
}

const $pressed: ViewStyle = {
  opacity: 0.72,
}

import { memo } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import type { CatalogueCourse } from "../domain/types"

interface CourseCardProps {
  course: CatalogueCourse
  onPress: () => void
}

function formatCreditValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, "")
}

export function formatCredits(minCredits: number, maxCredits: number): string {
  if (minCredits === maxCredits) {
    return `${formatCreditValue(minCredits)} ${minCredits === 1 ? "credit" : "credits"}`
  }

  return `${formatCreditValue(minCredits)}–${formatCreditValue(maxCredits)} credits`
}

export const CourseCard = memo(function CourseCard({ course, onPress }: CourseCardProps) {
  const { themed } = useAppTheme()

  return (
    <Pressable
      accessibilityLabel={`${course.code}, ${course.title}, ${formatCredits(course.minCredits, course.maxCredits)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [themed($card), pressed && $pressedCard]}
      testID={`course-card-${course.code}`}
    >
      <View style={$topRow}>
        <Text text={course.code} weight="bold" size="md" style={themed($courseCode)} />
        <View style={themed($departmentBadge)}>
          <Text text={course.departmentCode} size="xxs" weight="semiBold" />
        </View>
      </View>
      <Text text={course.title} size="sm" numberOfLines={2} style={$title} />
      <Text
        text={formatCredits(course.minCredits, course.maxCredits)}
        size="xs"
        style={themed($credits)}
      />
    </Pressable>
  )
})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.palette.neutral300,
  borderRadius: 20,
  borderWidth: 1,
  gap: spacing.xs,
  minHeight: 132,
  padding: spacing.md,
})

const $topRow: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
}

const $courseCode: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $departmentBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.secondary100,
  borderRadius: 12,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
})

const $title: TextStyle = {
  flexGrow: 1,
}

const $credits: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $pressedCard: ViewStyle = {
  opacity: 0.72,
}

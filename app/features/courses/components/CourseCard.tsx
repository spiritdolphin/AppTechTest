import { memo } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import type { CatalogueCourse } from "../domain/types"

interface CourseCardProps {
  course: CatalogueCourse
  lectureAvailability?: readonly boolean[]
  onPress: () => void
}

const MAX_VISIBLE_LECTURES = 8

function formatCreditValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, "")
}

export function formatCredits(minCredits: number, maxCredits: number): string {
  if (minCredits === maxCredits) {
    return `${formatCreditValue(minCredits)} ${minCredits === 1 ? "credit" : "credits"}`
  }

  return `${formatCreditValue(minCredits)}–${formatCreditValue(maxCredits)} credits`
}

export const CourseCard = memo(function CourseCard({
  course,
  lectureAvailability,
  onPress,
}: CourseCardProps) {
  const { themed } = useAppTheme()
  const lectureCount = lectureAvailability?.length ?? 0
  const availableCount = lectureAvailability?.filter(Boolean).length ?? 0

  return (
    <Pressable
      accessibilityLabel={`${course.code}, ${course.title}, ${formatCredits(course.minCredits, course.maxCredits)}${lectureCount ? `, archived lecture snapshot: ${availableCount} of ${lectureCount} with seats` : ""}`}
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
      <View style={$bottomRow}>
        <View style={themed($creditsBadge)}>
          <Text
            text={formatCredits(course.minCredits, course.maxCredits)}
            size="xs"
            style={themed($credits)}
          />
        </View>
        {!!lectureCount && (
          <View
            style={$availabilityRow}
            accessibilityElementsHidden
            importantForAccessibility="no"
            testID={`lecture-availability-${course.code}`}
          >
            <Text text="Avail" size="xxs" style={themed($credits)} />
            {lectureAvailability?.slice(0, MAX_VISIBLE_LECTURES).map((hasSeats, index) => (
              <View
                key={index}
                style={themed(hasSeats ? $availableDot : $fullDot)}
                testID={`lecture-dot-${course.code}-${index}`}
              />
            ))}
            {lectureCount > MAX_VISIBLE_LECTURES && (
              <Text
                text={`+${lectureCount - MAX_VISIBLE_LECTURES}`}
                size="xxs"
                style={themed($credits)}
              />
            )}
          </View>
        )}
      </View>
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

const $bottomRow: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
}
const $creditsBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 10,
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xxs,
})
const $availabilityRow: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  gap: 5,
  marginLeft: "auto",
}
const $availableDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.success,
  borderRadius: 4,
  height: 8,
  width: 8,
})
const $fullDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.statusClosed,
  borderRadius: 4,
  height: 8,
  width: 8,
})

const $pressedCard: ViewStyle = {
  opacity: 0.72,
}

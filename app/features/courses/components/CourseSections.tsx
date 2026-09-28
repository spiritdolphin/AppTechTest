import { useEffect, useState } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Accordion } from "./Accordion"
import type { CourseSection, SectionMeeting } from "../domain/types"

const sectionTypeLabels: Record<string, string> = {
  LEC: "Lecture",
  TUT: "Tutorial",
  LAB: "Laboratory",
  IND: "Independent study",
}

function Meeting({ meeting }: { meeting: SectionMeeting }) {
  const { themed } = useAppTheme()
  const venue = (meeting.venueName || meeting.venue).trim()
  const dateRange =
    meeting.dateFrom === meeting.dateTo
      ? meeting.dateFrom
      : `${meeting.dateFrom} – ${meeting.dateTo}`

  return (
    <View style={$meeting}>
      <Text
        text={`${meeting.weekday} ${meeting.timeFrom}–${meeting.timeTo}${venue ? ` · ${venue}` : ""}`}
        size="sm"
        selectable
      />
      <Text text={dateRange} size="xs" style={themed($secondaryText)} />
      {meeting.instructors.length > 0 && (
        <Text text={meeting.instructors.join(", ")} size="xs" style={themed($secondaryText)} />
      )}
    </View>
  )
}

function SectionCard({ section }: { section: CourseSection }) {
  const { themed } = useAppTheme()
  const typeLabel = sectionTypeLabels[section.type] ?? section.type
  const hasExtraInformation =
    !!section.remarks || section.reservations.length > 0 || section.association !== null
  const hasSeats = section.open && section.capacity > section.enrolled
  const snapshotDate = section.snapshotAt.slice(0, 10).split("-").reverse().join("-")

  return (
    <View style={themed($card)} testID={`course-section-${section.section}`}>
      <View style={$cardHeader}>
        <View style={$identityRow}>
          <Text text={section.section} size="xl" weight="bold" style={themed($sectionCode)} />
          {section.classNumber !== null && <Text text={`#${section.classNumber}`} size="sm" />}
        </View>
        <View style={$countsRow}>
          <View style={$countColumn}>
            <Text text="Enrolled" size="xxs" style={themed($secondaryText)} />
            <Text
              text={
                section.capacity > 0
                  ? `${section.enrolled}/${section.capacity}`
                  : `${section.enrolled}`
              }
              size="sm"
              weight="semiBold"
              style={themed(hasSeats ? $openText : $closedText)}
              accessibilityLabel={`Enrolled ${section.enrolled} of ${section.capacity}, ${hasSeats ? "open" : "closed"}`}
            />
          </View>
          <View style={$countColumn}>
            <Text text="Wait" size="xxs" style={themed($secondaryText)} />
            <Text text={`${section.waitlisted}`} size="sm" />
          </View>
        </View>
      </View>

      {section.meetings.length > 0 && (
        <View style={themed($meetingBox)}>
          {section.meetings.map((meeting, index) => (
            <Meeting
              key={`${meeting.weekday}-${meeting.timeFrom}-${meeting.dateFrom}-${index}`}
              meeting={meeting}
            />
          ))}
        </View>
      )}
      {section.consentRequired && <Text text="Instructor consent required" size="sm" />}

      {hasExtraInformation && (
        <Accordion title="More section information" compact>
          {section.association !== null && (
            <Text text={`Association group ${section.association}`} size="sm" />
          )}
          {!!section.remarks && <Text text={section.remarks} size="sm" selectable />}
          {section.reservations.map((reservation, index) => (
            <Text
              key={`${reservation.name}-${index}`}
              text={`${reservation.name}: ${reservation.enrolled} / ${reservation.quota} reserved places`}
              size="sm"
            />
          ))}
        </Accordion>
      )}

      <View style={$footer}>
        <Text text={`Snapshot ${snapshotDate}`} size="xxs" style={themed($secondaryText)} />
        <Text text={typeLabel} size="xxs" style={themed($secondaryText)} />
      </View>
    </View>
  )
}

export function CourseSections({ sections }: { sections: readonly CourseSection[] }) {
  const { themed } = useAppTheme()
  const [visibleCount, setVisibleCount] = useState(10)

  useEffect(() => setVisibleCount(10), [sections])

  if (sections.length === 0) return null

  return (
    <View style={themed($section)} testID="course-sections">
      <Text text="Sections" preset="subheading" />
      <Accordion
        title={`View ${sections.length} ${sections.length === 1 ? "section" : "sections"}`}
      >
        <Text
          text="Archived schedule snapshot; enrollment and availability may have changed."
          size="xs"
          style={themed($secondaryText)}
        />
        {sections.slice(0, visibleCount).map((section) => (
          <SectionCard key={section.section} section={section} />
        ))}
        {visibleCount < sections.length && (
          <Pressable
            accessibilityLabel={`Show more sections, ${sections.length - visibleCount} remaining`}
            accessibilityRole="button"
            onPress={() => setVisibleCount((count) => count + 10)}
            style={({ pressed }) => [themed($showMore), pressed && $pressed]}
            testID="sections-show-more"
          >
            <Text
              text={`Show more (${sections.length - visibleCount} remaining)`}
              weight="semiBold"
            />
          </Pressable>
        )}
      </Accordion>
    </View>
  )
}

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  marginBottom: spacing.xl,
})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 20,
  borderWidth: 1,
  gap: spacing.xs,
  padding: spacing.md,
})

const $cardHeader: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 8,
}

const $identityRow: ViewStyle = { alignItems: "center", flexDirection: "row", gap: 8 }
const $sectionCode: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.tint })
const $countsRow: ViewStyle = { flexDirection: "row", gap: 12 }
const $countColumn: ViewStyle = { alignItems: "flex-start" }
const $openText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.success })
const $closedText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.statusClosed })

const $secondaryText: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim })

const $meeting: ViewStyle = { gap: 2 }
const $meetingBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderColor: colors.border,
  borderRadius: 14,
  borderWidth: 1,
  gap: spacing.sm,
  padding: spacing.sm,
})
const $footer: ViewStyle = { flexDirection: "row", justifyContent: "space-between", gap: 8 }

const $showMore: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  borderColor: colors.border,
  borderRadius: 14,
  borderWidth: 1,
  justifyContent: "center",
  minHeight: 44,
  paddingHorizontal: spacing.md,
})

const $pressed: ViewStyle = { opacity: 0.72 }

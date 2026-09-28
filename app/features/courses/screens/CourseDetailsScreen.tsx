import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Accordion } from "../components/Accordion"
import { formatCredits } from "../components/CourseCard"
import { CourseSections } from "../components/CourseSections"
import { DependencyGraphView } from "../components/DependencyGraphView"
import { FilledTriangle } from "../components/FilledTriangle"
import { SelectionOption, SelectionSheet } from "../components/SelectionSheet"
import { courseRepository } from "../data/generatedCourseRepository"
import type { CourseRepository } from "../data/repository"
import type { CourseDetail, CourseSection } from "../domain/types"
import { useDependencyGraph } from "../utils/useDependencyGraph"

const COMPACT_GRAPH_MAX_DEPTH = 1

type CourseDetailsScreenProps = AppStackScreenProps<"CourseDetails"> & {
  repository?: CourseRepository
}

type LoadState = "loading" | "ready" | "missing" | "error"

interface LabelledValueProps {
  label: string
  value: string
}

function LabelledValue({ label, value }: LabelledValueProps) {
  const { themed } = useAppTheme()

  return (
    <View style={themed($labelledValue)}>
      <Text text={label.toUpperCase()} size="xxs" weight="semiBold" style={themed($eyebrow)} />
      <Text text={value} size="sm" selectable />
    </View>
  )
}

function CourseIdentityBadges({ detail }: { detail: CourseDetail }) {
  const { themed } = useAppTheme()
  const department = (detail.departmentNickname || detail.departmentCode).trim()
  const career = (detail.careerType || detail.careerCode).trim()
  const departmentCourseCode = department ? `${department} | ${detail.code}` : detail.code

  return (
    <View style={$badgeRow} testID="course-identity-badges">
      <View style={themed($primaryBadge)}>
        <Text
          text={departmentCourseCode}
          weight="bold"
          size="sm"
          style={themed($primaryBadgeText)}
          testID="department-course-code"
        />
      </View>
      <View style={themed($badge)}>
        <Text
          text={formatCredits(detail.minCredits, detail.maxCredits)}
          size="xs"
          testID="course-credits"
        />
      </View>
      {!!career && (
        <View style={themed($badge)}>
          <Text text={career} size="xs" testID="course-career" />
        </View>
      )}
    </View>
  )
}

export function CourseDetailsScreen({
  navigation,
  repository = courseRepository,
  route,
}: CourseDetailsScreenProps) {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const { courseCode, parentCourseCode, termCode: initialTermCode } = route.params
  const [selectedTermCode, setSelectedTermCode] = useState(initialTermCode)
  const [detail, setDetail] = useState<CourseDetail>()
  const [availableTermCodes, setAvailableTermCodes] = useState<Set<string>>()
  const [availabilityError, setAvailabilityError] = useState<string>()
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [loadError, setLoadError] = useState<string>()
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [semesterSheetVisible, setSemesterSheetVisible] = useState(false)
  const [sections, setSections] = useState<readonly CourseSection[]>()
  const [sectionsError, setSectionsError] = useState<string>()
  const [sectionsAttempt, setSectionsAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setAvailableTermCodes(undefined)
    setAvailabilityError(undefined)

    repository
      .getAvailableSemestersForCourse(courseCode)
      .then((semesters) => {
        if (active) setAvailableTermCodes(new Set(semesters.map(({ termCode }) => termCode)))
      })
      .catch((error: unknown) => {
        if (active) {
          setAvailabilityError(
            error instanceof Error ? error.message : "Unable to check semester availability.",
          )
        }
      })

    return () => {
      active = false
    }
  }, [courseCode, loadAttempt, repository])

  useEffect(() => {
    let active = true
    setDetail(undefined)
    setLoadError(undefined)
    setLoadState("loading")

    repository
      .getCourseDetail(selectedTermCode, courseCode)
      .then((loadedDetail) => {
        if (!active) return
        if (!loadedDetail) {
          setLoadState("missing")
          return
        }
        setDetail(loadedDetail)
        setLoadState("ready")
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : "Unable to load course details.")
        setLoadState("error")
      })

    return () => {
      active = false
    }
  }, [courseCode, loadAttempt, repository, selectedTermCode])

  useEffect(() => {
    let active = true
    setSections(undefined)
    setSectionsError(undefined)
    if (!detail || detail.termCode !== selectedTermCode || detail.code !== courseCode) return

    repository
      .getCourseSections(detail.termCode, detail.id)
      .then((loadedSections) => {
        if (active) setSections(loadedSections)
      })
      .catch((error: unknown) => {
        if (active) {
          setSectionsError(error instanceof Error ? error.message : "Unable to load sections.")
        }
      })

    return () => {
      active = false
    }
  }, [courseCode, detail, repository, sectionsAttempt, selectedTermCode])

  const selectedSemester = repository.getSemester(selectedTermCode)
  const semesterOptions = useMemo<SelectionOption[]>(
    () =>
      repository.getSemesters().map((semester) => ({
        disabled: availableTermCodes ? !availableTermCodes.has(semester.termCode) : true,
        label: semester.termName,
        supportingText: availableTermCodes
          ? availableTermCodes.has(semester.termCode)
            ? "Available"
            : "Not offered"
          : "Checking availability…",
        value: semester.termCode,
      })),
    [availableTermCodes, repository],
  )

  const retry = () => setLoadAttempt((attempt) => attempt + 1)
  const visibleAttributes =
    detail?.attributes.filter((attribute) =>
      [attribute.label, attribute.value, attribute.description].some((value) => value.trim()),
    ) ?? []
  const visibleLearningOutcomes = detail?.learningOutcomes.filter((outcome) => outcome.trim()) ?? []
  const {
    graph: dependencyGraph,
    isLoading: dependencyGraphLoading,
    loadError: dependencyGraphError,
    retry: retryDependencyGraph,
  } = useDependencyGraph({
    courseCode,
    maxDepth: COMPACT_GRAPH_MAX_DEPTH,
    repository,
    termCode: selectedTermCode,
  })

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={themed($screenContent)}
      ScrollViewProps={{ contentInsetAdjustmentBehavior: "automatic" }}
    >
      <Pressable
        accessibilityLabel={parentCourseCode ? `Back to ${parentCourseCode}` : "Back to catalogue"}
        accessibilityRole="button"
        onPress={navigation.goBack}
        style={({ pressed }) => [themed($backButton), pressed && $pressed]}
      >
        <FilledTriangle
          color={colors.tint}
          direction="left"
          style={themed($backIcon)}
          testID="details-back-triangle"
        />
        <Text text={parentCourseCode ? "Back" : "Catalogue"} weight="semiBold" />
      </Pressable>

      {loadState === "loading" ? (
        <View accessibilityLabel="Loading course details" style={themed($centerState)}>
          <ActivityIndicator color={colors.tint} size="large" />
          <Text text="Loading course details…" size="sm" style={themed($secondaryText)} />
        </View>
      ) : loadState === "error" ? (
        <View style={themed($centerState)}>
          <Text text="Could not load course details" preset="subheading" style={$centerText} />
          {!!loadError && (
            <Text text={loadError} size="sm" style={[themed($secondaryText), $centerText]} />
          )}
          <Button text="Try again" onPress={retry} style={$stateButton} />
        </View>
      ) : loadState === "missing" ? (
        <View style={themed($centerState)}>
          <Text text={`${courseCode} is unavailable`} preset="subheading" style={$centerText} />
          <Text
            text={`This course is not offered in ${selectedSemester?.termName ?? selectedTermCode}. Choose another available semester.`}
            size="sm"
            style={[themed($secondaryText), $centerText]}
          />
          <Button
            accessibilityLabel={`Choose semester for ${courseCode}`}
            text={selectedSemester?.termName ?? selectedTermCode}
            onPress={() => setSemesterSheetVisible(true)}
            style={$stateButton}
          />
        </View>
      ) : detail ? (
        <>
          <View style={themed($hero)}>
            <Text text={detail.title} preset="heading" selectable />
            <CourseIdentityBadges detail={detail} />
            <Pressable
              accessibilityLabel={`Semester, ${selectedSemester?.termName ?? selectedTermCode}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: semesterSheetVisible }}
              onPress={() => setSemesterSheetVisible(true)}
              style={({ pressed }) => [themed($semesterSelector), pressed && $pressed]}
              testID="details-semester-selector"
            >
              <View style={$selectorText}>
                <Text text="SEMESTER" size="xxs" weight="semiBold" style={themed($eyebrow)} />
                <Text text={selectedSemester?.termName ?? selectedTermCode} weight="semiBold" />
              </View>
              <FilledTriangle
                color={colors.text}
                direction="down"
                testID="details-semester-triangle"
              />
            </Pressable>
            {!!availabilityError && (
              <View style={themed($availabilityError)}>
                <Text text={availabilityError} size="xs" style={themed($errorText)} />
                <Button text="Retry semester availability" onPress={retry} />
              </View>
            )}
          </View>

          <View style={themed($section)}>
            <Text text="Description" preset="subheading" />
            {!!detail.description.trim() && <Text text={detail.description} selectable />}
          </View>

          {!!sectionsError ? (
            <View style={themed($section)} testID="course-sections-error">
              <Text text="Sections" preset="subheading" />
              <Text text="Could not load sections" weight="semiBold" />
              <Text text={sectionsError} size="xs" style={themed($secondaryText)} />
              <Button
                text="Retry sections"
                onPress={() => setSectionsAttempt((attempt) => attempt + 1)}
              />
            </View>
          ) : sections === undefined ? (
            <View
              accessibilityLabel="Loading sections"
              style={themed($section)}
              testID="course-sections-loading"
            >
              <Text text="Sections" preset="subheading" />
              <ActivityIndicator color={colors.tint} />
            </View>
          ) : (
            <CourseSections sections={sections} />
          )}

          <View style={themed($section)}>
            <Text text="Additional Information" preset="subheading" />

            {visibleAttributes.length > 0 && (
              <Accordion title={`Attributes (${visibleAttributes.length})`}>
                {visibleAttributes.map((attribute, index) => (
                  <View key={`${attribute.label}-${attribute.value}-${index}`} style={$detailItem}>
                    <Text
                      text={`${attribute.label} · ${attribute.value}`}
                      weight="semiBold"
                      size="sm"
                    />
                    {!!attribute.description.trim() && (
                      <Text text={attribute.description} size="sm" style={themed($secondaryText)} />
                    )}
                  </View>
                ))}
              </Accordion>
            )}

            {visibleLearningOutcomes.length > 0 && (
              <Accordion title={`Learning Outcomes (${visibleLearningOutcomes.length})`}>
                {visibleLearningOutcomes.map((outcome, index) => (
                  <View key={`${index}-${outcome}`} style={$numberedItem}>
                    <Text text={`${index + 1}.`} weight="semiBold" style={themed($number)} />
                    <Text text={outcome} size="sm" style={$numberedText} />
                  </View>
                ))}
              </Accordion>
            )}

            <OtherCourseInformation detail={detail} />
          </View>

          <View style={themed($section)}>
            <Text text="Requirements" preset="subheading" />
            {!!detail.prerequisite.trim() && (
              <LabelledValue label="Prerequisite" value={detail.prerequisite} />
            )}
            {!!detail.corequisite.trim() && (
              <LabelledValue label="Corequisite" value={detail.corequisite} />
            )}
            {!!detail.exclusion.trim() && (
              <LabelledValue label="Exclusion" value={detail.exclusion} />
            )}

            <Text
              accessibilityRole="header"
              text="DEPENDENCY VISUALIZER"
              size="xs"
              weight="semiBold"
              style={themed($graphEyebrow)}
              testID="dependency-visualizer-label"
            />

            {!!dependencyGraphError ? (
              <View style={themed($graphState)}>
                <Text text="Could not load dependency graph" weight="semiBold" />
                <Text
                  text={dependencyGraphError}
                  size="xs"
                  style={[themed($secondaryText), $centerText]}
                />
                <Button text="Retry dependency graph" onPress={retryDependencyGraph} />
              </View>
            ) : dependencyGraphLoading || !dependencyGraph ? (
              <View accessibilityLabel="Loading dependency graph" style={themed($graphState)}>
                <ActivityIndicator color={colors.tint} />
                <Text text="Loading dependency graph…" size="xs" style={themed($secondaryText)} />
              </View>
            ) : !dependencyGraph.currentCourseAvailable ? (
              <View style={themed($graphState)}>
                <Text text="Dependency graph unavailable" weight="semiBold" />
                <Text
                  text={`This course is not offered in ${selectedSemester?.termName ?? selectedTermCode}.`}
                  size="xs"
                  style={[themed($secondaryText), $centerText]}
                />
              </View>
            ) : (
              <>
                {dependencyGraph.mode === "extracted" && (
                  <View style={themed($graphNotice)}>
                    <Text text="Extracted courses" weight="semiBold" size="sm" />
                    <Text
                      text="Some conditions could not be interpreted reliably. Only recognized course references are shown."
                      size="xs"
                      style={themed($secondaryText)}
                    />
                  </View>
                )}
                <DependencyGraphView
                  graph={dependencyGraph}
                  onOpenCourse={(prerequisiteCode) =>
                    navigation.push("CourseDetails", {
                      courseCode: prerequisiteCode,
                      parentCourseCode: courseCode,
                      termCode: selectedTermCode,
                    })
                  }
                  termName={selectedSemester?.termName ?? selectedTermCode}
                />
              </>
            )}

            <Button
              accessibilityLabel={`View dependency graph for ${detail.code} in fullscreen`}
              text="View In Fullscreen"
              onPress={() =>
                navigation.navigate("DependencyExplorerFullscreen", {
                  courseCode: detail.code,
                  termCode: detail.termCode,
                })
              }
              style={themed($graphButton)}
              textStyle={themed($graphButtonText)}
            />
          </View>
        </>
      ) : null}

      <SelectionSheet
        onClose={() => setSemesterSheetVisible(false)}
        onSelect={setSelectedTermCode}
        options={semesterOptions}
        selectedValue={selectedTermCode}
        title={`Semester for ${courseCode}`}
        visible={semesterSheetVisible}
      />
    </Screen>
  )
}

function OtherCourseInformation({ detail }: { detail: CourseDetail }) {
  const { themed } = useAppTheme()
  const fields = [
    ["Academic year", detail.academicYear],
    ["School", detail.schoolCode],
    ["Campus", detail.campusName || detail.campusNickname || detail.campusCode],
    ["Previous", detail.previous],
    ["Alternate", detail.alternate],
    ["Background", detail.background],
    ["Co-list", detail.colist],
    ["Equivalence", detail.equivalence],
    ["Reference", detail.reference],
    ["Status", detail.status],
  ].filter((field): field is [string, string] => Boolean(field[1]?.trim()))

  if (fields.length === 0) return null

  return (
    <Accordion title="More Course Information">
      {fields.map(([label, value]) => (
        <View key={label} style={themed($catalogueField)}>
          <Text text={label} size="xs" weight="semiBold" style={themed($eyebrow)} />
          <Text text={value} size="sm" selectable />
        </View>
      ))}
    </Accordion>
  )
}

const $screenContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  gap: spacing.lg,
  paddingBottom: spacing.xxl,
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

const $backIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.xxs,
})

const $hero: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $badgeRow: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
}

const $primaryBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  borderRadius: 14,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
})

const $primaryBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $badge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.secondary100,
  borderRadius: 14,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
})

const $semesterSelector: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 18,
  borderWidth: 1,
  flexDirection: "row",
  minHeight: 58,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
})

const $selectorText: ViewStyle = {
  flex: 1,
}

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $labelledValue: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  flexGrow: 1,
  flexShrink: 1,
  gap: spacing.xxs,
  minWidth: 104,
  padding: spacing.md,
})

const $eyebrow: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 0.7,
})

const $secondaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $availabilityError: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $detailItem: ViewStyle = {
  gap: 3,
}

const $numberedItem: ViewStyle = {
  alignItems: "flex-start",
  flexDirection: "row",
  gap: 8,
}

const $number: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  minWidth: 24,
})

const $numberedText: TextStyle = {
  flex: 1,
}

const $catalogueField: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderBottomColor: colors.separator,
  borderBottomWidth: 1,
  gap: spacing.xxs,
  paddingBottom: spacing.sm,
})

const $graphButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderColor: colors.tint,
  borderRadius: 18,
})

const $graphButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $graphEyebrow: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 1.1,
})

const $graphState: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderRadius: 18,
  gap: spacing.xs,
  justifyContent: "center",
  minHeight: 112,
  padding: spacing.md,
})

const $graphNotice: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.accent100,
  borderRadius: 16,
  gap: spacing.xxs,
  padding: spacing.md,
})

const $centerState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.sm,
  justifyContent: "center",
  minHeight: 420,
  paddingHorizontal: spacing.lg,
})

const $centerText: TextStyle = {
  textAlign: "center",
}

const $stateButton: ViewStyle = {
  marginTop: 12,
  minWidth: 168,
}

const $pressed: ViewStyle = {
  opacity: 0.72,
}

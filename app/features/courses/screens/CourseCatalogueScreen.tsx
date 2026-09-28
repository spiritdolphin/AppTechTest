import { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { translate } from "@/i18n/translate"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { CourseCard } from "../components/CourseCard"
import { FilledTriangle } from "../components/FilledTriangle"
import { FilterChip } from "../components/FilterChip"
import { SelectionOption, SelectionSheet } from "../components/SelectionSheet"
import { courseRepository } from "../data/generatedCourseRepository"
import { catalogueFilterReducer } from "../domain/catalogueFilters"
import type { CatalogueCourse, CatalogueFile, LectureAvailabilityFile } from "../domain/types"
import { searchCourses } from "../utils/searchCourses"

type OpenSheet = "semester" | "department" | "theme" | undefined

export function CourseCatalogueScreen({
  navigation,
}: Pick<AppStackScreenProps<"CourseCatalogue">, "navigation">) {
  const {
    themed,
    theme: { colors },
    themeContextOverride,
    setThemeContextOverride,
  } = useAppTheme()
  const semesters = courseRepository.getSemesters()
  const [filters, dispatchFilters] = useReducer(catalogueFilterReducer, {
    termCode: courseRepository.getLatestSemester().termCode,
    departmentCode: "",
    query: "",
  })
  const { termCode: selectedTermCode, departmentCode: selectedDepartment, query } = filters
  const [catalogue, setCatalogue] = useState<CatalogueFile>()
  const [lectureAvailability, setLectureAvailability] = useState<LectureAvailabilityFile>()
  const [loadError, setLoadError] = useState<string>()
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [openSheet, setOpenSheet] = useState<OpenSheet>()

  const selectedSemester = courseRepository.getSemester(selectedTermCode)
  const departments = courseRepository.getDepartments(selectedTermCode)

  useEffect(() => {
    let active = true
    setCatalogue(undefined)
    setLectureAvailability(undefined)
    setLoadError(undefined)

    courseRepository
      .loadCatalogue(selectedTermCode)
      .then((loadedCatalogue) => {
        if (active) setCatalogue(loadedCatalogue)
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : translate("courseCatalogue:error"))
        }
      })

    courseRepository.loadLectureAvailability(selectedTermCode).then(
      (loadedAvailability) => {
        if (active) setLectureAvailability(loadedAvailability)
      },
      () => {
        // Catalogue remains usable if the optional schedule snapshot cannot load.
      },
    )

    return () => {
      active = false
    }
  }, [loadAttempt, selectedTermCode])

  const courses = useMemo(
    () =>
      catalogue
        ? searchCourses(catalogue.courses, {
            query,
            departmentCode: selectedDepartment || undefined,
          })
        : [],
    [catalogue, query, selectedDepartment],
  )

  const semesterOptions = useMemo<SelectionOption[]>(
    () =>
      semesters.map((semester) => ({
        label: semester.termName,
        supportingText: translate("courseCatalogue:courseCount", {
          formattedCount: semester.courseCount.toLocaleString("en-US"),
        }),
        value: semester.termCode,
      })),
    [semesters],
  )

  const departmentOptions = useMemo<SelectionOption[]>(
    () => [
      {
        label: translate("courseCatalogue:allDepartments"),
        supportingText: selectedSemester
          ? translate("courseCatalogue:courseCount", {
              formattedCount: selectedSemester.courseCount.toLocaleString("en-US"),
            })
          : undefined,
        value: "",
      },
      ...departments.map((department) => ({
        label: department.code,
        supportingText: `${department.name} · ${translate("courseCatalogue:courseCount", {
          formattedCount: department.courseCount.toLocaleString("en-US"),
        })}`,
        value: department.code,
      })),
    ],
    [departments, selectedSemester],
  )

  const selectSemester = useCallback((termCode: string) => {
    dispatchFilters({ type: "setSemester", termCode })
  }, [])

  const renderCourse = useCallback<ListRenderItem<CatalogueCourse>>(
    ({ item }) => (
      <CourseCard
        course={item}
        lectureAvailability={
          lectureAvailability?.termCode === selectedTermCode
            ? lectureAvailability.byCourseId[item.id]
            : undefined
        }
        onPress={() =>
          navigation.navigate("CourseDetails", {
            courseCode: item.code,
            termCode: selectedTermCode,
          })
        }
      />
    ),
    [lectureAvailability, navigation, selectedTermCode],
  )

  const listEmpty = useMemo(() => {
    if (!catalogue) return null
    return (
      <View style={themed($emptyState)}>
        <Text tx="courseCatalogue:noResultsTitle" preset="subheading" style={$centerText} />
        <Text
          tx="courseCatalogue:noResultsBody"
          size="sm"
          style={[themed($secondaryText), $centerText]}
        />
        {(query || selectedDepartment) && (
          <Button
            tx="courseCatalogue:clearFilters"
            onPress={() => dispatchFilters({ type: "clearSearchAndDepartment" })}
            style={$clearButton}
          />
        )}
      </View>
    )
  }, [catalogue, query, selectedDepartment, themed])

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={themed($screenContent)}
    >
      <View style={themed($header)}>
        <View style={themed($headerTopRow)}>
          <Text tx="courseCatalogue:eyebrow" size="xs" weight="semiBold" style={themed($eyebrow)} />
          <Pressable
            accessibilityLabel={translate("courseCatalogue:selectTheme")}
            accessibilityRole="button"
            accessibilityState={{ expanded: openSheet === "theme" }}
            onPress={() => setOpenSheet("theme")}
            style={({ pressed }) => [themed($themeButton), pressed && $pressed]}
            testID="catalogue-theme-button"
          >
            <Text tx="courseCatalogue:themeButton" size="xs" weight="semiBold" />
            <FilledTriangle color={colors.text} direction="down" />
          </Pressable>
        </View>
        <Text tx="courseCatalogue:title" preset="heading" />
      </View>

      <View style={$filterRow}>
        <View style={$filterCell} testID="catalogue-semester-filter-cell">
          <FilterChip
            accessibilityLabel={translate("courseCatalogue:selectSemester")}
            label={selectedSemester?.termName ?? selectedTermCode}
            onPress={() => setOpenSheet("semester")}
            testID="catalogue-semester-filter"
          />
        </View>
        <View style={$filterCell} testID="catalogue-department-filter-cell">
          <FilterChip
            accessibilityLabel={translate("courseCatalogue:selectDepartment")}
            label={selectedDepartment || translate("courseCatalogue:allDepartments")}
            onPress={() => setOpenSheet("department")}
            testID="catalogue-department-filter"
          />
        </View>
      </View>

      <TextField
        accessibilityLabel={translate("courseCatalogue:searchPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onChangeText={(nextQuery) => dispatchFilters({ type: "setQuery", query: nextQuery })}
        placeholderTx="courseCatalogue:searchPlaceholder"
        returnKeyType="search"
        testID="course-search-input"
        value={query}
        inputWrapperStyle={themed($searchInput)}
      />

      {!!catalogue && !loadError && (
        <View style={$resultHeader}>
          <Text
            accessibilityLabel={`${courses.length.toLocaleString("en-US")} courses`}
            text={translate("courseCatalogue:courseCount", {
              formattedCount: courses.length.toLocaleString("en-US"),
            })}
            size="xs"
            testID="course-result-count"
            weight="semiBold"
            style={themed($secondaryText)}
          />
          {!!query && (
            <Text
              text={`“${query}”`}
              size="xs"
              numberOfLines={1}
              style={[themed($secondaryText), $querySummary]}
            />
          )}
        </View>
      )}

      {!!loadError ? (
        <View style={themed($centerState)}>
          <Text tx="courseCatalogue:errorTitle" preset="subheading" style={$centerText} />
          <Text text={loadError} size="sm" style={[themed($secondaryText), $centerText]} />
          <Button
            tx="courseCatalogue:retry"
            onPress={() => setLoadAttempt((attempt) => attempt + 1)}
            style={$retryButton}
          />
        </View>
      ) : !catalogue ? (
        <View
          style={themed($centerState)}
          accessibilityLabel={translate("courseCatalogue:loading")}
        >
          <ActivityIndicator color={colors.tint} size="large" />
          <Text tx="courseCatalogue:loading" size="sm" style={themed($secondaryText)} />
        </View>
      ) : (
        <FlatList
          data={courses}
          initialNumToRender={12}
          keyExtractor={(course) => course.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          maxToRenderPerBatch={12}
          renderItem={renderCourse}
          windowSize={7}
          contentContainerStyle={themed([$listContent, courses.length === 0 && $emptyListContent])}
          ItemSeparatorComponent={() => <View style={themed($cardSeparator)} />}
          ListEmptyComponent={listEmpty}
        />
      )}

      <SelectionSheet
        onClose={() => setOpenSheet(undefined)}
        onSelect={selectSemester}
        options={semesterOptions}
        selectedValue={selectedTermCode}
        title={translate("courseCatalogue:semesterSheetTitle")}
        visible={openSheet === "semester"}
      />
      <SelectionSheet
        emptyMessage={translate("courseCatalogue:noDepartments")}
        onClose={() => setOpenSheet(undefined)}
        onSelect={(departmentCode) => dispatchFilters({ type: "setDepartment", departmentCode })}
        options={departmentOptions}
        searchPlaceholder={translate("courseCatalogue:departmentSearchPlaceholder")}
        selectedValue={selectedDepartment}
        title={translate("courseCatalogue:departmentSheetTitle")}
        visible={openSheet === "department"}
      />
      <SelectionSheet
        onClose={() => setOpenSheet(undefined)}
        onSelect={(value) =>
          setThemeContextOverride(value === "light" || value === "dark" ? value : undefined)
        }
        options={[
          { label: translate("courseCatalogue:themeSystem"), value: "system" },
          { label: translate("courseCatalogue:themeLight"), value: "light" },
          { label: translate("courseCatalogue:themeDark"), value: "dark" },
        ]}
        selectedValue={themeContextOverride ?? "system"}
        title={translate("courseCatalogue:themeSheetTitle")}
        visible={openSheet === "theme"}
      />
    </Screen>
  )
}

const $screenContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  flex: 1,
  justifyContent: "flex-start",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xxs,
  marginBottom: spacing.md,
})

const $headerTopRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flexDirection: "row",
  gap: spacing.sm,
  justifyContent: "space-between",
})

const $themeButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 16,
  borderWidth: 1,
  flexDirection: "row",
  gap: spacing.xs,
  minHeight: 44,
  paddingHorizontal: spacing.sm,
})

const $eyebrow: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 1.2,
})

const $secondaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $centerText: TextStyle = {
  textAlign: "center",
}

const $filterRow: ViewStyle = {
  flexDirection: "row",
  gap: 8,
  marginBottom: 12,
}

const $filterCell: ViewStyle = {
  flex: 1,
  minWidth: 0,
}

const $pressed: ViewStyle = {
  opacity: 0.72,
}

const $searchInput: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 18,
  minHeight: 52,
})

const $resultHeader: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
  minHeight: 42,
}

const $querySummary: TextStyle = {
  flex: 1,
  marginLeft: 16,
  textAlign: "right",
}

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.lg,
})

const $emptyListContent: ViewStyle = {
  flexGrow: 1,
}

const $cardSeparator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: spacing.sm,
})

const $centerState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flex: 1,
  gap: spacing.sm,
  justifyContent: "center",
  paddingHorizontal: spacing.lg,
})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xxl,
})

const $clearButton: ViewStyle = {
  marginTop: 12,
  minWidth: 144,
}

const $retryButton: ViewStyle = {
  marginTop: 12,
  minWidth: 144,
}

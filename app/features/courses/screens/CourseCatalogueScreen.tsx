import { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
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
import { FilterChip } from "../components/FilterChip"
import { SelectionOption, SelectionSheet } from "../components/SelectionSheet"
import { courseRepository } from "../data/generatedCourseRepository"
import { catalogueFilterReducer } from "../domain/catalogueFilters"
import type { CatalogueCourse, CatalogueFile } from "../domain/types"
import { searchCourses } from "../utils/searchCourses"

type OpenSheet = "semester" | "department" | undefined

export function CourseCatalogueScreen({
  navigation,
}: Pick<AppStackScreenProps<"CourseCatalogue">, "navigation">) {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const semesters = courseRepository.getSemesters()
  const [filters, dispatchFilters] = useReducer(catalogueFilterReducer, {
    termCode: courseRepository.getLatestSemester().termCode,
    departmentCode: "",
    query: "",
  })
  const { termCode: selectedTermCode, departmentCode: selectedDepartment, query } = filters
  const [catalogue, setCatalogue] = useState<CatalogueFile>()
  const [loadError, setLoadError] = useState<string>()
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [openSheet, setOpenSheet] = useState<OpenSheet>()

  const selectedSemester = courseRepository.getSemester(selectedTermCode)
  const departments = courseRepository.getDepartments(selectedTermCode)

  useEffect(() => {
    let active = true
    setCatalogue(undefined)
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
        onPress={() =>
          navigation.navigate("CourseDetails", {
            courseCode: item.code,
            termCode: selectedTermCode,
          })
        }
      />
    ),
    [navigation, selectedTermCode],
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
        <Text tx="courseCatalogue:eyebrow" size="xs" weight="semiBold" style={themed($eyebrow)} />
        <Text tx="courseCatalogue:title" preset="heading" />
        <Text tx="courseCatalogue:subtitle" size="sm" style={themed($secondaryText)} />
      </View>

      <View style={$filterRow}>
        <View style={$semesterChip}>
          <FilterChip
            accessibilityLabel={translate("courseCatalogue:selectSemester")}
            label={selectedSemester?.termName ?? selectedTermCode}
            onPress={() => setOpenSheet("semester")}
          />
        </View>
        <View style={$departmentChip}>
          <FilterChip
            accessibilityLabel={translate("courseCatalogue:selectDepartment")}
            label={selectedDepartment || translate("courseCatalogue:allDepartments")}
            onPress={() => setOpenSheet("department")}
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

const $semesterChip: ViewStyle = {
  flex: 1.25,
}

const $departmentChip: ViewStyle = {
  flex: 1,
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

import { fireEvent, render, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { CourseCatalogueScreen } from "../app/features/courses/screens/CourseCatalogueScreen"
import { colors as lightColors } from "../app/theme/colors"
import { colors as darkColors } from "../app/theme/colorsDark"
import { ThemeProvider } from "../app/theme/context"

jest.mock("../app/i18n/translate", () => ({
  translate: (key: string, options?: { formattedCount?: string }) =>
    key === "courseCatalogue:courseCount" ? `${options?.formattedCount} courses` : key,
}))

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

describe("CourseCatalogueScreen", () => {
  test("loads the latest catalogue and updates results while typing", async () => {
    const navigation = { navigate: jest.fn() }
    const screen = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <CourseCatalogueScreen navigation={navigation as never} />
        </ThemeProvider>
      </SafeAreaProvider>,
    )

    const resultCount = await screen.findByTestId("course-result-count")
    expect(resultCount.props.accessibilityLabel).toBe("3,928 courses")
    expect(screen.getByText("3,928 courses")).toBeTruthy()
    expect(screen.getByText("ACCT 1010")).toBeTruthy()
    expect(screen.queryByText("courseCatalogue:subtitle")).toBeNull()

    const semesterFilter = screen.getByTestId("catalogue-semester-filter")
    const departmentFilter = screen.getByTestId("catalogue-department-filter")
    expect(screen.getByTestId("catalogue-semester-filter-cell")).toHaveStyle({
      flex: 1,
      minWidth: 0,
    })
    expect(screen.getByTestId("catalogue-department-filter-cell")).toHaveStyle({
      flex: 1,
      minWidth: 0,
    })
    expect(semesterFilter).toHaveStyle({ width: "100%" })
    expect(departmentFilter).toHaveStyle({ width: "100%" })
    for (const filter of ["semester", "department"]) {
      const triangle = screen
        .UNSAFE_getAllByProps({ testID: `catalogue-${filter}-filter-triangle` })
        .find((candidate) => candidate.props.style)
      expect(triangle?.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderTopWidth: 7 })]),
      )
    }

    const searchInput = screen.getByTestId("course-search-input")
    expect(searchInput).toHaveProp("textAlignVertical", "center")
    expect(searchInput).toHaveStyle({ alignSelf: "center" })
    fireEvent.changeText(searchInput, "comp-1021")

    await waitFor(() => expect(screen.getByText("COMP 1021")).toBeTruthy())
    expect(screen.queryByText("ACCT 1010")).toBeNull()
  })

  test("opens course details with the course code and current semester", async () => {
    const navigation = { navigate: jest.fn() }
    const screen = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <CourseCatalogueScreen navigation={navigation as never} />
        </ThemeProvider>
      </SafeAreaProvider>,
    )

    fireEvent.press(await screen.findByTestId("course-card-ACCT 1010"))

    expect(navigation.navigate).toHaveBeenCalledWith("CourseDetails", {
      courseCode: "ACCT 1010",
      termCode: "2610",
    })
  })

  test("offers system, light, and dark appearance choices", async () => {
    const navigation = { navigate: jest.fn() }
    const screen = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <CourseCatalogueScreen navigation={navigation as never} />
        </ThemeProvider>
      </SafeAreaProvider>,
    )

    const themeButton = screen.getByTestId("catalogue-theme-button")
    expect(themeButton).toHaveProp("accessibilityRole", "button")
    expect(themeButton).toHaveStyle({ minHeight: 44 })
    fireEvent.press(themeButton)
    expect(screen.getByLabelText("courseCatalogue:themeSystem")).toHaveProp("accessibilityState", {
      disabled: false,
      selected: true,
    })

    fireEvent.press(screen.getByLabelText("courseCatalogue:themeDark"))
    await waitFor(() =>
      expect(screen.getByTestId("catalogue-theme-button")).toHaveStyle({
        backgroundColor: darkColors.palette.neutral100,
      }),
    )

    fireEvent.press(screen.getByTestId("catalogue-theme-button"))
    expect(screen.getByLabelText("courseCatalogue:themeDark")).toHaveProp("accessibilityState", {
      disabled: false,
      selected: true,
    })
    fireEvent.press(screen.getByLabelText("courseCatalogue:themeLight"))
    await waitFor(() =>
      expect(screen.getByTestId("catalogue-theme-button")).toHaveStyle({
        backgroundColor: lightColors.palette.neutral100,
      }),
    )

    fireEvent.press(screen.getByTestId("catalogue-theme-button"))
    fireEvent.press(screen.getByLabelText("courseCatalogue:themeSystem"))
    fireEvent.press(screen.getByTestId("catalogue-theme-button"))
    expect(screen.getByLabelText("courseCatalogue:themeSystem")).toHaveProp("accessibilityState", {
      disabled: false,
      selected: true,
    })
  })
})

import { fireEvent, render, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { CourseCatalogueScreen } from "../app/features/courses/screens/CourseCatalogueScreen"
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
})

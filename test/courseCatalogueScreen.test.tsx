import { fireEvent, render, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { CourseCatalogueScreen } from "../app/features/courses/screens/CourseCatalogueScreen"
import { ThemeProvider } from "../app/theme/context"

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

describe("CourseCatalogueScreen", () => {
  test("loads the latest catalogue and updates results while typing", async () => {
    const screen = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <CourseCatalogueScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    )

    const resultCount = await screen.findByTestId("course-result-count")
    expect(resultCount.props.accessibilityLabel).toBe("3,928 courses")
    expect(screen.getByText("ACCT 1010")).toBeTruthy()

    fireEvent.changeText(screen.getByTestId("course-search-input"), "comp-1021")

    await waitFor(() => expect(screen.getByText("COMP 1021")).toBeTruthy())
    expect(screen.queryByText("ACCT 1010")).toBeNull()
  })
})

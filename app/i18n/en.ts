const en = {
  common: {
    ok: "OK",
    cancel: "Cancel",
    back: "Back",
  },
  errorScreen: {
    title: "Something went wrong",
    friendlySubtitle: "The app hit an unexpected error. Reset it to try again.",
    reset: "RESET APP",
    traceTitle: "Error from {{name}} stack",
  },
  emptyStateComponent: {
    generic: {
      heading: "Nothing here yet",
      content: "Try adjusting your search or filters.",
      button: "Try again",
    },
  },
  courseCatalogue: {
    eyebrow: "COURSE CATALOGUE",
    title: "UST Course Explorer",
    themeButton: "Theme",
    selectTheme: "Choose appearance",
    themeSheetTitle: "Appearance",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    searchPlaceholder: "Search course code or title...",
    selectSemester: "Select semester",
    selectDepartment: "Select department",
    semesterSheetTitle: "Semester",
    departmentSheetTitle: "Department",
    departmentSearchPlaceholder: "Search departments...",
    allDepartments: "All Departments",
    courseCount: "{{formattedCount}} courses",
    loading: "Loading courses...",
    error: "Unable to load the course catalogue.",
    errorTitle: "Could not load courses",
    retry: "Try again",
    noResultsTitle: "No matching courses",
    noResultsBody: "Try a different course code, title, or department.",
    clearFilters: "Clear search and filter",
    noDepartments: "No matching departments",
  },
}

export default en
export type Translations = typeof en

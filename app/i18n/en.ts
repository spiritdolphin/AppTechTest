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
    traceTitle: "Error from %{name} stack",
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
    subtitle: "Browse HKUST courses and understand their prerequisites.",
    statusTitle: "Course data is the next milestone",
    statusBody: "The app shell is ready for local course data.",
  },
}

export default en
export type Translations = typeof en

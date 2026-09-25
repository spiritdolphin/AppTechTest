export interface CatalogueFilterState {
  departmentCode: string
  query: string
  termCode: string
}

export type CatalogueFilterAction =
  | { type: "setDepartment"; departmentCode: string }
  | { type: "setQuery"; query: string }
  | { type: "setSemester"; termCode: string }
  | { type: "clearSearchAndDepartment" }

export function catalogueFilterReducer(
  state: CatalogueFilterState,
  action: CatalogueFilterAction,
): CatalogueFilterState {
  switch (action.type) {
    case "setDepartment":
      return { ...state, departmentCode: action.departmentCode }
    case "setQuery":
      return { ...state, query: action.query }
    case "setSemester":
      if (action.termCode === state.termCode) return state
      return { termCode: action.termCode, departmentCode: "", query: "" }
    case "clearSearchAndDepartment":
      return { ...state, departmentCode: "", query: "" }
  }
}

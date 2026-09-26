import { appStackOrientationConfig } from "../app/navigators/orientationConfig"
import appConfig from "../app.json"

describe("orientation configuration", () => {
  test("supports native rotation while locking every non-fullscreen route to portrait", () => {
    expect(appConfig.orientation).toBe("default")
    expect(appStackOrientationConfig.default).toBe("portrait")
    expect(appStackOrientationConfig.overrides).toEqual({
      DependencyExplorerFullscreen: "landscape",
    })
  })
})

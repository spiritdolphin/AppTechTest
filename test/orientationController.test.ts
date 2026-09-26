import * as ScreenOrientation from "expo-screen-orientation"

import {
  AppOrientationController,
  orientationLockForRoute,
} from "../app/navigators/orientationController"
import appConfig from "../app.json"

jest.mock("expo-screen-orientation", () => ({
  OrientationLock: {
    LANDSCAPE: 5,
    PORTRAIT_UP: 3,
  },
  lockAsync: jest.fn(() => Promise.resolve()),
}))

describe("app orientation controller", () => {
  test("uses a fixed portrait lock everywhere except the fullscreen visualizer", () => {
    expect(orientationLockForRoute()).toBe(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    expect(orientationLockForRoute("CourseCatalogue")).toBe(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    )
    expect(orientationLockForRoute("CourseDetails")).toBe(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    )
    expect(orientationLockForRoute("DependencyExplorerFullscreen")).toBe(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    )
  })

  test("reapplies the latest route lock after an older async request finishes", async () => {
    let finishFirstLock: (() => void) | undefined
    const firstLock = new Promise<void>((resolve) => {
      finishFirstLock = resolve
    })
    const lockOrientation = jest
      .fn<Promise<void>, [ScreenOrientation.OrientationLock]>()
      .mockImplementationOnce(() => firstLock)
      .mockResolvedValue(undefined)
    const controller = new AppOrientationController(lockOrientation)

    const portraitRequest = controller.lockForRoute("CourseCatalogue")
    await controller.lockForRoute("DependencyExplorerFullscreen")
    finishFirstLock?.()
    await portraitRequest

    expect(lockOrientation).toHaveBeenNthCalledWith(
      1,
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    )
    expect(lockOrientation).toHaveBeenNthCalledWith(2, ScreenOrientation.OrientationLock.LANDSCAPE)
    expect(lockOrientation).toHaveBeenNthCalledWith(3, ScreenOrientation.OrientationLock.LANDSCAPE)
  })

  test("does not crash when the platform rejects an orientation lock", async () => {
    const controller = new AppOrientationController(() =>
      Promise.reject(new Error("Orientation lock unavailable")),
    )

    await expect(controller.lockForRoute("CourseCatalogue")).resolves.toBeUndefined()
  })

  test("keeps native rotation support with a portrait-up launch lock", () => {
    expect(appConfig.orientation).toBe("default")
    expect(appConfig.plugins).toContainEqual([
      "expo-screen-orientation",
      { initialOrientation: "PORTRAIT_UP" },
    ])
  })
})

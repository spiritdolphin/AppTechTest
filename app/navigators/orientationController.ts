import * as ScreenOrientation from "expo-screen-orientation"

import type { AppStackParamList } from "./navigationTypes"

type AppRouteName = keyof AppStackParamList
type LockOrientation = (orientationLock: ScreenOrientation.OrientationLock) => Promise<void>

export function orientationLockForRoute(
  routeName?: AppRouteName,
): ScreenOrientation.OrientationLock {
  return routeName === "DependencyExplorerFullscreen"
    ? ScreenOrientation.OrientationLock.LANDSCAPE
    : ScreenOrientation.OrientationLock.PORTRAIT_UP
}

export class AppOrientationController {
  private requestVersion = 0
  private latestLock = ScreenOrientation.OrientationLock.PORTRAIT_UP

  constructor(private readonly lockOrientation: LockOrientation = ScreenOrientation.lockAsync) {}

  async lockForRoute(routeName?: AppRouteName): Promise<void> {
    const requestVersion = ++this.requestVersion
    const requestedLock = orientationLockForRoute(routeName)
    this.latestLock = requestedLock

    if (!(await this.tryLock(requestedLock))) return

    if (requestVersion !== this.requestVersion) {
      await this.tryLock(this.latestLock)
    }
  }

  private async tryLock(orientationLock: ScreenOrientation.OrientationLock): Promise<boolean> {
    try {
      await this.lockOrientation(orientationLock)
      return true
    } catch {
      return false
    }
  }
}

export const appOrientationController = new AppOrientationController()

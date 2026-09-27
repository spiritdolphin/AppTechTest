import { StyleProp, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"

interface FilledTriangleProps {
  color: string
  direction: "down" | "left"
  style?: StyleProp<ViewStyle>
  testID?: string
}

export function FilledTriangle({ color, direction, style, testID }: FilledTriangleProps) {
  const {
    theme: { colors },
  } = useAppTheme()
  const triangle: ViewStyle =
    direction === "down"
      ? {
          borderLeftColor: colors.transparent,
          borderLeftWidth: 6,
          borderRightColor: colors.transparent,
          borderRightWidth: 6,
          borderTopColor: color,
          borderTopWidth: 7,
        }
      : {
          borderBottomColor: colors.transparent,
          borderBottomWidth: 6,
          borderRightColor: color,
          borderRightWidth: 8,
          borderTopColor: colors.transparent,
          borderTopWidth: 6,
        }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[$zeroSize, triangle, style]}
      testID={testID}
    />
  )
}

const $zeroSize: ViewStyle = { height: 0, width: 0 }

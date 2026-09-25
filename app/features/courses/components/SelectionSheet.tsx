import { useEffect, useMemo, useState } from "react"
import { FlatList, Modal, Pressable, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SelectionOption {
  disabled?: boolean
  label: string
  supportingText?: string
  value: string
}

interface SelectionSheetProps {
  emptyMessage?: string
  onClose: () => void
  onSelect: (value: string) => void
  options: readonly SelectionOption[]
  searchPlaceholder?: string
  selectedValue: string
  title: string
  visible: boolean
}

export function SelectionSheet({
  emptyMessage = "No options found",
  onClose,
  onSelect,
  options,
  searchPlaceholder,
  selectedValue,
  title,
  visible,
}: SelectionSheetProps) {
  const { bottom } = useSafeAreaInsets()
  const {
    themed,
    theme: { colors, spacing },
  } = useAppTheme()
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!visible) setQuery("")
  }, [visible])

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return options

    return options.filter(({ label, supportingText }) =>
      `${label} ${supportingText ?? ""}`.toLowerCase().includes(normalizedQuery),
    )
  }, [options, query])

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={$modalRoot}>
        <Pressable
          accessibilityLabel={`Close ${title}`}
          accessibilityRole="button"
          onPress={onClose}
          style={themed($backdrop)}
        />
        <View style={[themed($sheet), { paddingBottom: Math.max(bottom, spacing.md) }]}>
          <View style={themed($handle)} />
          <View style={$header}>
            <Text text={title} preset="subheading" />
            <Pressable
              accessibilityLabel={`Close ${title}`}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [$closeButton, pressed && $pressedOption]}
            >
              <Text text="×" size="lg" accessibilityElementsHidden />
            </Pressable>
          </View>

          {!!searchPlaceholder && (
            <TextField
              accessibilityLabel={searchPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              value={query}
              containerStyle={{ marginBottom: spacing.sm }}
              inputWrapperStyle={themed($searchInput)}
            />
          )}

          <FlatList
            data={filteredOptions}
            keyExtractor={({ value }) => value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.value === selectedValue
              return (
                <Pressable
                  accessibilityLabel={item.label}
                  accessibilityRole="radio"
                  accessibilityState={{ disabled: !!item.disabled, selected }}
                  disabled={item.disabled}
                  onPress={() => {
                    onSelect(item.value)
                    onClose()
                  }}
                  style={({ pressed }) => [
                    themed($option),
                    selected && themed($selectedOption),
                    item.disabled && themed($disabledOption),
                    pressed && $pressedOption,
                  ]}
                >
                  <View style={$optionText}>
                    <Text text={item.label} weight={selected ? "semiBold" : "normal"} />
                    {!!item.supportingText && (
                      <Text
                        text={item.supportingText}
                        size="xs"
                        style={{ color: colors.textDim }}
                      />
                    )}
                  </View>
                  {selected && <Text text="✓" weight="bold" style={themed($checkmark)} />}
                </Pressable>
              )
            }}
            ItemSeparatorComponent={() => <View style={themed($separator)} />}
            ListEmptyComponent={
              <Text text={emptyMessage} style={[themed($emptyMessage), $centerText]} />
            }
          />
        </View>
      </View>
    </Modal>
  )
}

const $modalRoot: ViewStyle = {
  flex: 1,
  justifyContent: "flex-end",
}

const $backdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  ...StyleSheet.absoluteFillObject,
  backgroundColor: colors.palette.overlay50,
})

const $sheet: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  maxHeight: "82%",
  minHeight: 240,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
})

const $handle: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignSelf: "center",
  backgroundColor: colors.border,
  borderRadius: 2,
  height: 4,
  marginBottom: spacing.sm,
  width: 36,
})

const $header: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
}

const $closeButton: ViewStyle = {
  alignItems: "center",
  height: 44,
  justifyContent: "center",
  width: 44,
}

const $searchInput: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 16,
  minHeight: 48,
})

const $option: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
  minHeight: 56,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
})

const $selectedOption: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.secondary100,
  borderRadius: 14,
})

const $pressedOption: ViewStyle = {
  opacity: 0.7,
}

const $disabledOption: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral200,
  opacity: 0.48,
})

const $optionText: ViewStyle = {
  flex: 1,
}

const $checkmark: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginLeft: spacing.sm,
})

const $separator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.separator,
  height: StyleSheet.hairlineWidth,
})

const $emptyMessage: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xl,
})

const $centerText: TextStyle = {
  textAlign: "center",
}

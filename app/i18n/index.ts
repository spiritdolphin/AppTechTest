import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import "intl-pluralrules"

import en, { Translations } from "./en"

export const isRTL = false

export async function initI18n() {
  i18n.use(initReactI18next)

  await i18n.init({
    resources: { en },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  })

  return i18n
}

export type TxKeyPath = RecursiveKeyOf<Translations>

type RecursiveKeyOf<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`, true>
}[keyof TObj & (string | number)]

type RecursiveKeyOfInner<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`, false>
}[keyof TObj & (string | number)]

type RecursiveKeyOfHandleValue<
  TValue,
  Text extends string,
  IsFirstLevel extends boolean,
> = TValue extends any[]
  ? Text
  : TValue extends object
    ? IsFirstLevel extends true
      ? Text | `${Text}:${RecursiveKeyOfInner<TValue>}`
      : Text | `${Text}.${RecursiveKeyOfInner<TValue>}`
    : Text

/** Locale-owned copy for the processing-session context card. */
export const zh = {
  'processing.title': '正在处理这件事',
  'processing.label': '桌面事项',
  'processing.visualOnly': '助手能从台账读到这件事的详情；直接说要做什么就行，它会先核对台账再动手。',
} as const

/** First-mile dictionary key union. */
export type FirstMileKey = keyof typeof zh

/** English dictionary with the same keys. */
export const en = {
  'processing.title': 'Processing this matter',
  'processing.label': 'Desk matter',
  'processing.visualOnly': 'The assistant reads this matter\'s details from the ledger; just say what to do — it checks the ledger before acting.',
} satisfies Record<FirstMileKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Matter-specific visual context shown in processing conversations. */
    assistantFirstMile: FirstMileKey
  }
}

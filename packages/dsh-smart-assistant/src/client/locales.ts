/** Locale-owned copy for the processing-session context card. */
export const zh = {
  'processing.title': '正在处理这件事',
  'processing.label': '桌面事项',
  'processing.visualOnly': '事项信息只显示在界面上；助手不会自动获知这些内容，需要参考时请在对话里明确告诉它。',
} as const

/** First-mile dictionary key union. */
export type FirstMileKey = keyof typeof zh

/** English dictionary with the same keys. */
export const en = {
  'processing.title': 'Processing this matter',
  'processing.label': 'Desk matter',
  'processing.visualOnly': 'Matter details are shown only in the interface; the assistant does not receive them automatically. Tell it explicitly in chat when they should inform its response.',
} satisfies Record<FirstMileKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Matter-specific visual context shown in processing conversations. */
    assistantFirstMile: FirstMileKey
  }
}

/** Locale-owned copy for the processing-session context card. */
export const zh = {
  'processing.title': '正在处理这件事',
  'processing.label': '事项',
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

/** Locale-owned copy for ledger attention and matter history views. */
export const deskZh = {
  'desk.view.attention': '关注',
  'desk.view.matters': '全部事项',
  'desk.view.activity': '流水',
  'desk.attention.title': '现在值得看',
  'desk.attention.empty': '当前没有到期未见结果的在办事项，也没有待你确认的提案。',
  'desk.attention.empty.note': '到期与待确认可以同时出现；账本没有记录事项之间的依赖关系。',
  'desk.attention.due': '到期 {days} 天 · 尚无完成结果',
  'desk.attention.due.today': '今天到期 · 尚无完成结果',
  'desk.attention.pending': '另有 {count} 条待确认',
  'desk.attention.open': '查看这件事',
  'desk.timeline.return': '返回「{view}」',
  'desk.timeline.title': '这件事的记录',
  'desk.timeline.current': '当前状态',
  'desk.times.responsible': '负责人',
  'desk.times.promised': '承诺',
  'desk.times.forecast': '客户预测',
  'desk.times.checkpoint': '下次核对',
  'desk.times.completed': '完成于',
  'desk.provenance.unknown': '来源未记录',
  'desk.operationStatus.retained': '存入待认领',
  'desk.operationStatus.conflict': '冲突未生效',
  'desk.operationStatus.rejected': '未生效',
  'desk.operationStatus.proposed': '待确认 · 尚未生效',
  'desk.activity.empty': '还没有账本操作记录。',
  'desk.activity.showMore': '显示更早',
  'desk.archive.more': '读取更早记录',
  'desk.archive.loading': '正在读取…',
  'desk.archive.retry': '重试读取',
  'desk.archive.error': '读取更早记录失败。',
  'desk.timeline.source': '来源材料',
  'desk.timeline.proposal': '变更提案',
  'desk.timeline.operation': '账本操作',
  'desk.timeline.pending': '待本人确认 · 尚未生效',
  'desk.timeline.confirmed': '已确认',
  'desk.timeline.rejected': '已拒绝',
  'desk.timeline.unknownDate': '时间未记录',
  'desk.timeline.noRecords': '当前投影没有这件事项的来源或操作记录。',
  'desk.timeline.recordOrder': '按账本记录时间排列；顺序只表示记录先后，不解释业务因果。',
  'desk.timeline.more': '读取更早记录',
  'desk.operation.create': '建立事项',
  'desk.operation.update': '更新事项',
  'desk.operation.note': '记下一条',
  'desk.operation.claim': '认领归户',
  'desk.operation.discard': '判为噪音',
  'desk.operation.complete': '办结',
  'desk.operation.reopen': '重新打开',
  'desk.operation.propose': '提出变更',
  'desk.operation.confirm': '确认提案',
  'desk.operation.reject': '拒绝提案',
  'desk.operation.unknown': '操作',
  'desk.proposal.reschedule': '拟改承诺期限',
  'desk.proposal.checkpoint': '拟改核对点',
  'desk.proposal.complete': '拟办结',
  'desk.proposal.abandon': '拟放弃',
} as const

export type DeskKey = keyof typeof deskZh
export type DeskDynamicKey = 'desk.operation.create' | 'desk.operation.update' | 'desk.operation.note' | 'desk.operation.claim' | 'desk.operation.discard' | 'desk.operation.complete' | 'desk.operation.reopen' | 'desk.operation.propose' | 'desk.operation.confirm' | 'desk.operation.reject' | 'desk.operation.unknown' | 'desk.proposal.reschedule' | 'desk.proposal.checkpoint' | 'desk.proposal.complete' | 'desk.proposal.abandon'
export type DeskTranslate = import('@deepseek-ai/dsh-client-ui-slots').Translate<DeskKey | DeskDynamicKey>

/** English dictionary with the same desk keys. */
export const deskEn = {
  'desk.view.attention': 'Attention',
  'desk.view.matters': 'All matters',
  'desk.view.activity': 'Activity',
  'desk.attention.title': 'Worth a look now',
  'desk.attention.empty': 'No active matters are overdue without a result or waiting for confirmation.',
  'desk.attention.empty.note': 'Due and pending signals can overlap; no matter dependencies are recorded in the ledger.',
  'desk.attention.due': 'Due {days} days ago · no completion result',
  'desk.attention.due.today': 'Due today · no completion result',
  'desk.attention.pending': '{count} pending proposal(s)',
  'desk.attention.open': 'Open matter',
  'desk.timeline.return': 'Back to {view}',
  'desk.timeline.title': 'Matter records',
  'desk.timeline.current': 'Current status',
  'desk.times.responsible': 'Responsible',
  'desk.times.promised': 'Commitment',
  'desk.times.forecast': 'Customer forecast',
  'desk.times.checkpoint': 'Next check',
  'desk.times.completed': 'Completed at',
  'desk.provenance.unknown': 'Source not recorded',
  'desk.operationStatus.retained': 'Kept unclaimed',
  'desk.operationStatus.conflict': 'Conflict · not applied',
  'desk.operationStatus.rejected': 'Not applied',
  'desk.operationStatus.proposed': 'Awaiting confirmation · not effective',
  'desk.activity.empty': 'No ledger operations yet.',
  'desk.activity.showMore': 'Show earlier activity',
  'desk.archive.more': 'Load earlier records',
  'desk.archive.loading': 'Loading records…',
  'desk.archive.retry': 'Retry loading',
  'desk.archive.error': 'Could not load earlier records.',
  'desk.timeline.source': 'Source material',
  'desk.timeline.proposal': 'Change proposal',
  'desk.timeline.operation': 'Ledger operation',
  'desk.timeline.pending': 'Awaiting principal confirmation · not effective',
  'desk.timeline.confirmed': 'Confirmed',
  'desk.timeline.rejected': 'Rejected',
  'desk.timeline.unknownDate': 'Time not recorded',
  'desk.timeline.noRecords': 'The current projection has no source or operation records for this matter.',
  'desk.timeline.recordOrder': 'Ordered by ledger record time; order states record sequence, not business causality.',
  'desk.timeline.more': 'Load earlier records',
  'desk.operation.create': 'Matter created',
  'desk.operation.update': 'Matter updated',
  'desk.operation.note': 'Note retained',
  'desk.operation.claim': 'Material claimed',
  'desk.operation.discard': 'Marked as noise',
  'desk.operation.complete': 'Completed',
  'desk.operation.reopen': 'Reopened',
  'desk.operation.propose': 'Change proposed',
  'desk.operation.confirm': 'Proposal confirmed',
  'desk.operation.reject': 'Proposal rejected',
  'desk.operation.unknown': 'Operation',
  'desk.proposal.reschedule': 'Proposed deadline change',
  'desk.proposal.checkpoint': 'Proposed checkpoint change',
  'desk.proposal.complete': 'Proposed completion',
  'desk.proposal.abandon': 'Proposed abandonment',
} satisfies Record<DeskKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Matter-specific visual context shown in processing conversations. */
    assistantFirstMile: FirstMileKey
    /** Ledger attention and matter-history views in the main panel. */
    assistantDesk: DeskKey
  }
}

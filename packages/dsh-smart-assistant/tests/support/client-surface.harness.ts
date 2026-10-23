/**
 * The browser half's test-only surface.
 *
 * The serving entry (`src/client/index.ts`) exposes only its product interface (`inject`, `apply`)
 * plus the live desk store; everything else a component test needs is re-exported here instead.
 * This is deliberately a test asset, not a second public entry: it keeps the factory's interface
 * small while the specs still exercise the same module instances.
 *
 * Import order matters only for module evaluation; the harness materializes the factory (which
 * binds the runtime `require`) before a test calls any component, so `createElement` is bound.
 */
export { AssistantBrandMark, AssistantBrandName, AssistantHeroMark } from '../../src/client/chrome/brand'
export { roomCommands } from '../../src/client/chrome/commands'
export { DashboardMainPanel, DashboardPanelIcon } from '../../src/client/chrome/dashboard'
export { ApprovalDockBanner, FirstMileDock } from '../../src/client/chrome/first-mile'
export { RememberAction } from '../../src/client/rooms/message-action'
export { KnowledgeIcon, KnowledgePanel, MemoryIcon, MemoryPanel } from '../../src/client/rooms/panels'
export { ReceiptView, markReceiptRead, readReceiptSince, resetReceiptBaseline } from '../../src/client/rooms/receipt-view'
export { approveKnowledgePage, correctMemory, deprecateKnowledgePage, retireMemory, retireSkill } from '../../src/client/rooms/room-data-actions'
export { deskSlice, expirePending, settlePending } from '../../src/client/rooms/room-data-core'
export { bindDeskEnv, loadDeskFor, loadSkillBody } from '../../src/client/rooms/room-data-io'
export { KnowledgeTabBody, MemoryTabBody, SkillsTabBody, VikiTabBody, roomTabTitle, roomTabs } from '../../src/client/rooms/room-tabs'
export { SkillsIcon, SkillsPanel } from '../../src/client/rooms/skills-panel'
export { bindVikiEnv, deleteViki, getVikiView, loadViki, loadVikiBody, loadVikiDiagnostics, loadVikiSearch, referencesViki, resetVikiView, restoreViki, useVikiView } from '../../src/client/rooms/viki-data-io'
export { VikiIcon, VikiPanel } from '../../src/client/rooms/viki-panel'

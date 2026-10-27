/**
 * Portable user-data export/import for the two plugin-owned directories.
 *
 * The bundle is deliberately narrow: `<assistant>` and `<assistant-operating>` only. Sessions,
 * credentials, settings and storages belong to the harness home and stay out; the agent artifact
 * never enters. A manifest names the schema generation so an importer can refuse a future bundle
 * instead of guessing.
 *
 * This module is shared by the shipped `assistant-data` bin and the repo tests. It uses Node
 * built-ins plus package-internal pure modules only, so the installed bin does not need the
 * harness peers.
 *
 * A bundle is plain data: exporting a working folder that contains a symbolic link is refused
 * rather than silently copying the link into a backup that another machine will restore. The
 * ledger's `writer.lock` and the atomic-write `*.tmp` siblings are transient coordination state,
 * not user data: they never enter a bundle, and an older bundle that carries them is cleaned on
 * import so restoring a backup cannot plant a foreign host's live claim.
 *
 * @module dsh-smart-assistant/cli/assistant-data
 */


export * from './assistant-data-types.ts'
export * from './assistant-data-bundle.ts'
export { PURGE_KINDS, purgeData, rotateArchives, type ArchiveRotationEntry, type ArchiveRotationOptions, type ArchiveRotationResult, type DataPurgeOptions, type DataPurgeResult, type PurgeKind } from './assistant-data-maintenance.ts'
export { checkData, statusData, type DataCheck, type DataLedgerStatus, type DataRetentionStatus, type DataStatus, type DataTreeStatus } from './assistant-data-status.ts'
export { sealBundle, unsealBundle, type SealBundleOptions, type SealedBundleResult, type UnsealBundleOptions } from './assistant-data-seal.ts'

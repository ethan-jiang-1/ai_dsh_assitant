/**
 * Portable data-bundle vocabulary: manifest constants, option/result types, and the merge
 * preference. Kept apart from the bundle implementation so the CLI entry can re-export a
 * stable surface without importing the filesystem-heavy module.
 *
 * @module dsh-smart-assistant/cli/assistant-data-types
 */

/** Manifest file written at the bundle root. */
export const DATA_MANIFEST_FILE = 'manifest.json'

/** Current export schema. Importers refuse anything else. */
export const DATA_SCHEMA_VERSION = 1

/** A read-only `check` warning threshold for the append-only operation archive. */
/** Default ceiling for a whole-bundle import; explicit override via `--max-bytes`. */
export const MAX_IMPORT_BYTES = 512 * 1024 * 1024

/** Arguments for {@link archiveResolvedProposals}. */
export interface ProposalArchiveOptions {
  readonly assistantDir: string
  /** Moves files; the caller must pass true explicitly. */
  readonly confirm: boolean
}

/** Result of rotating resolved proposals out of the active inbox. */
export interface ProposalArchiveResult {
  readonly moved: readonly string[]
  readonly kept: readonly string[]
}

/** Conflict policy for a merge: keep the target (safe default) or take the bundle. */
export type MergePreference = 'current' | 'incoming'

/** Arguments for {@link mergeData}. */
export interface DataMergeOptions {
  readonly inDir: string
  readonly assistantDir: string
  readonly operatingDir: string
  /** Default is a dry run; apply writes adds and (for the working folder) preferred conflicts. */
  readonly apply?: boolean
  /** `current` keeps the target on conflict; `incoming` replaces working-folder files. */
  readonly prefer?: MergePreference
  readonly maxBytes?: number
}

/** One merge decision, relative to the bundle root. */
export interface DataMergeEntry {
  readonly path: string
  readonly kind: 'add' | 'conflict' | 'same'
}

/** Result of a merge dry run/apply. */
export interface DataMergeResult {
  readonly dryRun: boolean
  readonly added: readonly DataMergeEntry[]
  readonly conflicts: readonly DataMergeEntry[]
  readonly same: readonly DataMergeEntry[]
  readonly backups: readonly string[]
  readonly audit: string
}


/** Arguments for {@link refreshManual}. */
export interface ManualRefreshOptions {
  readonly assistantDir: string
  /** Destructive to hand edits unless backed up; caller must pass true explicitly. */
  readonly confirm: boolean
  /** Clock override for tests. */
  readonly now?: Date
}

/** Result of a manual refresh. */
export interface ManualRefreshResult {
  readonly path: string
  readonly backup?: string
  readonly previousVersion?: number
}

/** What an export bundle declares about itself. */
export interface DataManifest {
  /** Export schema generation. */
  readonly schemaVersion: 1
  /** Export time, ISO-8601. */
  readonly createdAt: string
  /** Bundle contents; a future schema may add more. */
  readonly includes: readonly ['assistant', 'assistant-operating']
  /** File count across both included directories. */
  readonly files: number
  /** Byte count across both included directories. */
  readonly bytes: number
}

/** Arguments for {@link exportData}. */
export interface DataExportOptions {
  /** Working folder to include (the service's `dataDir`). */
  readonly assistantDir: string
  /** Operating ledger directory to include; a missing one exports empty. */
  readonly operatingDir: string
  /** Destination bundle directory; must be absent or empty. */
  readonly outDir: string
  /** Clock override for tests. */
  readonly now?: Date
}

/** Result of an export. */
export interface DataExportResult {
  readonly manifest: DataManifest
  readonly outDir: string
}

/** Arguments for {@link importData}. */
export interface DataImportOptions {
  /** Bundle directory produced by {@link exportData}. */
  readonly inDir: string
  /** Destination working folder; must be absent or empty unless `replace` is set. */
  readonly assistantDir: string
  /** Destination operating ledger; must be absent or empty unless `replace` is set. */
  readonly operatingDir: string
  /**
   * Restore over an existing home. A non-empty destination is moved aside to
   * `<dir>.pre-import-<id>` before the import (never deleted); a failed import restores it.
   */
  readonly replace?: boolean
  /** Validate and report what would be imported, without changing anything. */
  readonly dryRun?: boolean
  /** Refuse a bundle larger than this many bytes; defaults to {@link MAX_IMPORT_BYTES}. */
  readonly maxBytes?: number
}

/** Result of an import. */
export interface DataImportResult {
  readonly assistantFiles: number
  readonly operatingFiles: number
  /** Sibling backups created by `replace`, in the order they were stashed. */
  readonly backups: readonly string[]
  /** True on a dry run; nothing was written. */
  readonly dryRun?: true
  /** On a dry run with `replace`, the targets that would be moved aside. */
  readonly wouldStash?: readonly string[]
  /** Per-file preview on a dry run: bundle-only paths and differing/removed target paths. */
  readonly preview?: { readonly added: readonly string[], readonly replaced: readonly string[], readonly removed: readonly string[] }
}

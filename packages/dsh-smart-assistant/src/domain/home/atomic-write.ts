/**
 * Atomic replacement for the home's machine-owned files.
 *
 * Every writer in the home replaces a file by writing a sibling temp file and renaming it into
 * place, so a reader never observes a half-written file. The temp name must be unique **per write**:
 * a fixed `${path}.tmp` let two concurrent writers of the same target share one temp, and the
 * later rename lost it to the earlier one (ENOENT). The home is a cross-session shared folder, so
 * that collision is a real, if rare, shape — and on the paths that delete a source after the
 * rename (room archive, skill archive) a lost temp strands the record instead of merely losing a
 * rewrite.
 *
 * This is the single owner of that discipline (BUG-007 F8, 2026-10-07 fix; generalized 2026-10-08
 * after the same fixed-temp pattern was found still live on three sibling call sites).
 *
 * @module dsh-smart-assistant/home/atomic-write
 */

import { rename, writeFile } from 'node:fs/promises'

/** Build a temp path for `path` that no concurrent writer of the same target will pick. */
function temporaryPathFor(path: string): string {
  const unique = `${process.pid.toString(36)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `${path}.${unique}.tmp`
}

/**
 * Write `content` to `path` atomically: a unique sibling temp, then a rename into place.
 *
 * Mode 0600 is deliberate: a rename replaces the inode, so a file created before the owner-only
 * policy (0644) is narrowed on its next rewrite instead of keeping the wider mode. Test code and
 * callers that need different bits pass `mode` explicitly.
 * @param path - Destination file path.
 * @param content - Complete file content.
 * @param mode - Permission bits for the fresh inode (subject to umask).
 */
export async function atomicWriteFile(path: string, content: string, mode = 0o600): Promise<void> {
  const temporary = temporaryPathFor(path)
  await writeFile(temporary, content, { encoding: 'utf8', mode })
  await rename(temporary, path)
}

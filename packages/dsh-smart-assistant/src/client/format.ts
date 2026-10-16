/**
 * The desk's time formatting family. Five distinct renderings, one home: the ledger stamps
 * machine timestamps (zone, seconds, milliseconds) that read as noise on a desk, and each surface
 * needs a different slice of the same instant. Zone-bearing values render in the viewer's local
 * wall time; zone-less values keep their written wall-clock intent; unparseable values pass
 * through verbatim rather than becoming "Invalid Date".
 *
 * @module dsh-smart-assistant/client/format
 */

/**
 * Two-digit zero padding for one local time component.
 * @param value - The component to pad.
 * @returns The component as two digits.
 */
function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * A full machine timestamp (T separator, seconds, zone offset) reads as noise on the desk.
 * Zone-bearing values (Z or ±HH:MM) render in the viewer's local wall time — the ledger stamps
 * completion in UTC while deadlines/checkpoints carry an explicit offset. Zone-less values
 * (bare dates, naive datetimes) stay verbatim: their wall-clock intent is already local.
 * @param value - The timestamp to render.
 * @returns `YYYY-MM-DD HH:mm` for timestamp-shaped values, otherwise the value verbatim.
 */
export function humanTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    const at = new Date(value)
    if (!Number.isNaN(at.getTime())) {
      return `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())} ${pad2(at.getHours())}:${pad2(at.getMinutes())}`
    }
  }
  const naive = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value)
  return naive === null ? value : `${naive[1]} ${naive[2]}`
}

/**
 * The local day key the activity feed groups one day's entries under.
 * @param value - The timestamp to key.
 * @returns `YYYY-MM-DD` in the viewer's zone, or the value verbatim when unparseable.
 */
export function localDateKey(value: string): string {
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return value
  return `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())}`
}

/**
 * The human label for one activity-feed day.
 * @param value - A timestamp on that day.
 * @returns `M月D日 周X`, or the value verbatim when unparseable.
 */
export function localDateLabel(value: string): string {
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return value
  return `${at.getMonth() + 1}月${at.getDate()}日 周${'日一二三四五六'[at.getDay()]}`
}

/**
 * The wall-clock time of one activity-feed entry, in the viewer's zone.
 * @param value - The timestamp to render.
 * @returns `HH:mm`, or the value verbatim when unparseable.
 */
export function localTimeLabel(value: string): string {
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return value
  return `${pad2(at.getHours())}:${pad2(at.getMinutes())}`
}

/**
 * A timestamp the principal can read at a glance. ISO strings ("2026-09-26T05:10:02.454Z") are
 * for machines; a desk shows "09-26 13:10". Unparseable values pass through untouched rather
 * than turning into "Invalid Date".
 * @param value - The timestamp to render; absent or blank renders as an empty string.
 * @returns `MM-DD HH:mm` in the viewer's zone, otherwise the value verbatim.
 */
export function shortTime(value: string | undefined): string {
  if (value === undefined || value.trim() === '') return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return `${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`
}

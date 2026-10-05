/**
 * Shared presentation plumbing for the three model-facing tools.
 *
 * A completed card cannot read the canonical return value — `ToolResult` carries only model-facing
 * content, the error flag, and the tool-private payload its `output.presentationMeta` projector
 * produced. So every tool here projects a one-line `summary` into that payload and the completed card
 * reads it back. The read is deliberately defensive: the payload is persisted JSON replayed from
 * arbitrary logged calls, which is exactly the boundary where narrowing is required rather than
 * assumed.
 *
 * @module dsh-smart-assistant/tool-support/presentation
 */

/** Card returned by a tool's `presentCall`. */
type CallCard = { card: 'generic', title: string, kind: 'other', rawInput?: unknown }

/** Card returned by a tool's `presentResult`. */
type ResultCard = { card: 'generic', title?: string }

/**
 * Project the durable payload a completed card needs.
 * @param summary - One-line description of what the call did.
 * @returns The payload persisted on `tool/result`.
 */
export function presentationMeta(summary: string): { summary: string } {
  return { summary }
}

/**
 * Read the summary back out of a persisted result payload.
 * @param meta - `ToolResult.meta`, absent when no projector ran.
 * @returns The summary, or `undefined` when the payload is absent or not the expected shape.
 */
export function summaryFrom(meta: unknown): string | undefined {
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) return undefined
  const value = (meta as Record<string, unknown>).summary
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Build the pending card for a call.
 * @param title - Card title, e.g. `Memory recall`.
 * @param rawInput - Optional raw input the UI shows for the pending state.
 * @returns The pending card.
 */
export function callCard(title: string, rawInput?: unknown): CallCard {
  return rawInput === undefined
    ? { card: 'generic', title, kind: 'other' }
    : { card: 'generic', title, kind: 'other', rawInput }
}

/**
 * Build the completed card, preferring the persisted summary over the pending title.
 * @param meta - `ToolResult.meta`.
 * @param fallbackTitle - Title to keep when no summary was persisted.
 * @returns The completed card.
 */
export function resultCard(meta: unknown, fallbackTitle: string): ResultCard {
  const summary = summaryFrom(meta)
  return summary === undefined ? { card: 'generic', title: fallbackTitle } : { card: 'generic', title: summary }
}

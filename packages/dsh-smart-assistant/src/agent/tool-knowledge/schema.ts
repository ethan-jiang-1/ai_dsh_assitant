/**
 * The declared output schema of the `assistant_knowledge` tool: the JSON contract every result is
 * validated against before the presenter formats it. The tool definition, its model-facing
 * description, its parameter schema, and the presenter stay in `./index.ts`; this module owns
 * the output contract alone.
 *
 * @module dsh-smart-assistant/tool-knowledge/schema
 */
const PAGE_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true },
    type: { type: 'string', required: true },
    status: { type: 'string', required: true },
    title: { type: 'string' },
    description: { type: 'string' },
    stale_after: { type: 'string' },
    body: { type: 'string' },
    why: { type: 'array', items: { type: 'string' } },
  },
} as const

export const KNOWLEDGE_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    pages: { type: 'array', required: true, items: PAGE_ITEM },
    backlinks: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

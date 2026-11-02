/**
 * The declared output schema of the `assistant_research` tool: the JSON contract every result is
 * validated against before the presenter formats it. The tool definition, its model-facing
 * description, its parameter schema, and the presenter stay in `./index.ts`; this module owns
 * the output contract alone.
 *
 * @module dsh-smart-assistant/tool-research/schema
 */
const THREAD_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true },
    status: { type: 'string', required: true },
    question: { type: 'string', required: true },
    why: { type: 'string', required: true },
    lean: { type: 'string', required: true },
    evidence: { type: 'array', required: true, items: { type: 'string' } },
    updated: { type: 'string', required: true },
  },
} as const

export const RESEARCH_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    threads: { type: 'array', required: true, items: THREAD_ITEM },
  },
} as const

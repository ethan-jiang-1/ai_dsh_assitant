/**
 * The declared output schema of the `assistant_recall` tool: the JSON contract every result is
 * validated against before the presenter formats it. The tool definition, its model-facing
 * description, its parameter schema, and the presenter stay in `./index.ts`; this module owns
 * the output contract alone.
 *
 * @module dsh-smart-assistant/tool-recall/schema
 */
export const RECALL_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    result: { type: 'string', required: true },
  },
} as const

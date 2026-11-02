/**
 * The declared output schema of the `assistant_reflect` tool: the JSON contract every result is
 * validated against before the presenter formats it. The tool definition, its model-facing
 * description, its parameter schema, and the presenter stay in `./index.ts`; this module owns
 * the output contract alone.
 *
 * @module dsh-smart-assistant/learn/schema
 */
export const REFLECT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    session_id: { type: 'string', required: true },
    asks: { type: 'array', required: true, items: { type: 'string' } },
    tool_calls: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          count: { type: 'integer', required: true },
        },
      },
    },
    related_memories: { type: 'array', required: true, items: { type: 'string' } },
    open_threads: { type: 'array', required: true, items: { type: 'string' } },
    shadowed_skills: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          provider: { type: 'string', required: true },
        },
      },
    },
    pending_proposals: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          status: { type: 'string', required: true },
          revision: { type: 'integer', required: true },
        },
      },
    },
    skill_usage: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          count: { type: 'integer', required: true },
          last_used: { type: 'string' },
        },
      },
    },
    audit_findings: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          code: { type: 'string', required: true },
          severity: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
      },
    },
    skill_path: { type: 'string', required: true },
    snapshot_path: { type: 'string', required: true },
    page_id: { type: 'string', required: true },
    page_path: { type: 'string', required: true },
    proposal_status: { type: 'string', required: true },
  },
} as const

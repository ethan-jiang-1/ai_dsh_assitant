/**
 * The declared output schema of the `assistant_memory` tool: the JSON contract every result is
 * validated against before the presenter formats it. The tool definition, its model-facing
 * description, its parameter schema, and the presenter stay in `./index.ts`; this module owns
 * the output contract alone.
 *
 * @module dsh-smart-assistant/tool-memory/schema
 */
const MEMORY_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true },
    kind: { type: 'string', required: true },
    status: { type: 'string', required: true },
    text: { type: 'string', required: true },
    tags: { type: 'array', required: true, items: { type: 'string' } },
    importance: { type: 'integer', required: true },
    updated: { type: 'string', required: true },
    why: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

const FINDING_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    code: { type: 'string', required: true },
    severity: { type: 'string', required: true },
    message: { type: 'string', required: true },
    refs: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

const SKILL_USAGE_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', required: true },
    count: { type: 'integer', required: true },
    last_used: { type: 'string' },
    days_since_last_use: { type: 'integer' },
  },
} as const

export const MEMORY_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    memories: { type: 'array', required: true, items: MEMORY_ITEM },
    findings: { type: 'array', required: true, items: FINDING_ITEM },
    skill_usage: { type: 'array', items: SKILL_USAGE_ITEM },
    skill_usage_window: { type: 'string' },
    counts: {
      type: 'object',
      additionalProperties: false,
      properties: {
        memories: { type: 'integer', required: true },
        activeMemories: { type: 'integer', required: true },
        threads: { type: 'integer', required: true },
        openThreads: { type: 'integer', required: true },
        parkedThreads: { type: 'integer', required: true },
        learnedSkills: { type: 'integer', required: true },
        knowledgePages: { type: 'integer', required: true },
        retiredSkillBundles: { type: 'integer', required: true },
        skillSnapshots: { type: 'integer', required: true },
        digestBytes: { type: 'integer', required: true },
        digestMaxBytes: { type: 'integer', required: true },
      },
    },
  },
} as const

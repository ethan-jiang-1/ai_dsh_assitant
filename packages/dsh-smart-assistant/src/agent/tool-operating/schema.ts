/**
 * The declared output schema of the `assistant_operating` tool: the JSON contract every result is
 * validated against before the presenter formats it. The tool definition, its model-facing
 * description, its parameter schema, and the presenter stay in `./index.ts`; this module owns the
 * output contract alone, so the 160-line literal is navigable without the adapter around it.
 *
 * @module dsh-smart-assistant/tool-operating/schema
 */

export const OPERATING_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
     source: {
       type: 'object',
       additionalProperties: false,
       properties: {
         sessionId: { type: 'string', required: true },
         eventId: { type: 'string' },
         quote: { type: 'string' },
       },
     },
    receipt: {
      type: 'object',
      additionalProperties: false,
      properties: {
        operationId: { type: 'string', required: true },
        matterId: { type: 'string', required: true },
        submittedAt: { type: 'string', required: true },
       outcome: {
          type: 'object',
          required: true,
          additionalProperties: false,
          properties: {
            status: { type: 'string', required: true },
            revision: { type: 'integer' },
            unclaimedId: { type: 'string' },
            proposalId: { type: 'string' },
            observedRevision: { type: 'integer' },
            currentRevision: { type: 'integer' },
            reason: { type: 'string' },
          },
        },
      },
    },
    matters: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          title: { type: 'string', required: true },
          status: { type: 'string', required: true },
          revision: { type: 'integer', required: true },
          summary: { type: 'string' },
          responsible: { type: 'string' },
          promised_deadline: { type: 'string' },
          forecast_at: { type: 'string' },
          forecast_source: {
            type: 'object', additionalProperties: false,
            properties: { sessionId: { type: 'string', required: true }, eventId: { type: 'string' }, quote: { type: 'string' } },
          },
          next_checkpoint: { type: 'string' },
          completed_at: { type: 'string' },
        },
      },
    },
    unclaimed: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          note: { type: 'string', required: true },
          sessionId: { type: 'string', required: true },
        },
      },
    },
    materials: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          note: { type: 'string', required: true },
          sessionId: { type: 'string', required: true },
          quote: { type: 'string' },
        },
      },
    },
    entrust: {
      type: 'object', additionalProperties: false,
      properties: {
        operation_id: { type: 'string', required: true },
        sessionId: { type: 'string', required: true },
        eventId: { type: 'string' },
        quote: { type: 'string' },
      },
    },
    operations: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          operationId: { type: 'string', required: true },
          kind: { type: 'string', required: true },
          submittedAt: { type: 'string', required: true },
          outcome: {
            type: 'object', required: true, additionalProperties: false,
            properties: {
              status: { type: 'string', required: true },
              revision: { type: 'integer' },
              proposalId: { type: 'string' },
              unclaimedId: { type: 'string' },
              observedRevision: { type: 'integer' },
              currentRevision: { type: 'integer' },
              reason: { type: 'string' },
            },
          },
          source: {
            type: 'object', additionalProperties: false,
            properties: { sessionId: { type: 'string', required: true }, eventId: { type: 'string' }, quote: { type: 'string' } },
          },
        },
      },
    },
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          kind: { type: 'string', required: true },
          proposed_at: { type: 'string', required: true },
          change: {
            type: 'object', required: true, additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true },
              promisedDeadline: { type: 'string' },
              nextCheckpoint: { type: 'string' },
              evidence: {
                type: 'object', additionalProperties: false,
                properties: {
                  note: { type: 'string', required: true },
                  source: {
                    type: 'object', additionalProperties: false,
                    properties: { sessionId: { type: 'string', required: true }, eventId: { type: 'string' }, quote: { type: 'string' } },
                  },
                },
              },
            },
          },
          source: {
             type: 'object', additionalProperties: false,
             properties: { sessionId: { type: 'string', required: true }, eventId: { type: 'string' }, quote: { type: 'string' } },
           },
           resolution_operation_id: { type: 'string' },
          status: { type: 'string', required: true },
        },
      },
    },
  },
} as const

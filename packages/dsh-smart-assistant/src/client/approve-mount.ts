/**
 * The knowledge-approve direct-call lane (approve-direct-call): the typert contribution this
 * classic-script face mounts so `remote.assistantKnowledge.approvePage` reaches the host service
 * without a model round trip. Failure degrades the approve button to the legacy prompt path,
 * announced in-panel by `room-data-actions`.
 *
 * The diagnostic stays at info level **by design**: this pin deterministically rejects the mount
 * (strict codec vs classic-script contribution, 261004-approve-direct-call), and an error here
 * would pollute every first open and trip the web-face scenes' empty-console contract
 * (first-open-draft-banner caught exactly that on 2026-10-05).
 *
 * @module dsh-smart-assistant/client/approve-mount
 */

import { patchDesk } from './room-data-core'
import { getDeskRemote } from './room-data-io'

/**
 * Build the typert contribution the client mounts for the knowledge-approve direct-call lane.
 * Hand-written (the vendor generator targets tsdown builds; this package's classic-script
 * face carries it inline), and using the `src-json` codec mode — TypertCodec's union offers
 * a no-schema shape exactly so a plain-JSON caller does not need a materialized zod schema,
 * which a classic-script contribution cannot reach.
 */
function buildApproveContribution(): unknown {
  return {
    package: 'dsh-smart-assistant',
    descriptors: [{
      id: 'dsh-smart-assistant#knowledgeApproveRemote/approvePage',
      service: 'knowledgeApproveRemote',
      namespace: 'assistantKnowledge',
      method: 'approvePage',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'src-json' } }],
      result: { mode: 'src-json' },
    }],
  }
}

/**
 * Mount the approve contribution when the client remote service offers `$mount`; otherwise warn
 * and leave the prompt path in place.
 */
export function mountApproveRemote(): void {
  const deskRemote = getDeskRemote()
  if (typeof (deskRemote as { $mount?: unknown })?.$mount === 'function') {
    // TypertCodec's `src-json` mode needs no zod schema, so a classic-script contribution
    // can carry plain-JSON codecs without reaching the shell's module table.
    const contribution = buildApproveContribution()
    void Promise.resolve(
      (deskRemote as { $mount: (c: unknown) => Promise<unknown> }).$mount(contribution),
    ).then(() => {
      // Mount evidence: the approve button's direct-call branch reads this namespace.
      console.info('assistantKnowledge remote mounted')
    }).catch((reason: unknown) => {
      console.info('assistantKnowledge mount failed (fallback prompt path stays):', String(reason))
      patchDesk({ note: `批准直调通道未挂载（回退指令通道）：${String(reason)}` })
    })
  } else {
    console.warn('assistantKnowledge mount skipped: no $mount on the client remote service')
  }
}

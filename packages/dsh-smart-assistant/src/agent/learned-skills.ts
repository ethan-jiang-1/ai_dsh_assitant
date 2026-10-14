/** Learned-skill provider and usage observer contributed by the assistant preset. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-skill'
import * as skillFilesystem from '@deepseek-ai/dsh-skill-filesystem'
import { skillLoadFromResult } from '../domain/skills/usage.ts'
import { LEARNED_PROVIDER_NAME } from './tool-support/learned-provider.ts'

/**
 * Register the home skills directory as a preset-scoped provider and record successful tool loads.
 * @param ctx - Agent-plane context with the home service and skill registry.
 * @returns Nothing; Cordis owns both registrations through the provided context.
 */
export function installLearnedSkills(ctx: Context): void {
  ctx.plugin(skillFilesystem, {
    providerName: LEARNED_PROVIDER_NAME,
    includeDefaultRoots: false,
    customSkillDirs: [ctx.assistantMemory.paths.skillsDir],
    watch: true,
  })

  // Slash invocation inserts skill content as a message and deliberately bypasses this tool event.
  ctx.on('tools/result', (exec, result): undefined => {
    const name = skillLoadFromResult(exec.name, exec.arguments, result.isError)
    if (name === undefined) return undefined
    void ctx.assistantMemory.recordSkillLoad(name).catch((error: unknown) => {
      ctx.logger.warn(`skill usage record failed for "${name}": ${String(error)}`)
    })
    return undefined
  })
}

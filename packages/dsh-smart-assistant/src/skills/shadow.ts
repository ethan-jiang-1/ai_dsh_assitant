/**
 * Shadow detection for learned skills: a same-named skill from another provider wins the
 * registry's name resolution, so the learned bundle exists on disk but will never load —
 * `save_skill` said success, the catalog never shows it (tri-line proposal 2026-09-24, slice 1b;
 * the campaign observed the losing side is reported only as a provider logger warn).
 *
 * The check asks the registry who owns each name instead of reimplementing its precedence rules
 * (rank, layer, registration order): those are upstream semantics, and a copy would drift. The
 * probe runs where the registry can see the preset's layers — the agent-plane tool contexts —
 * and the result is joined here, purely.
 *
 * @module dsh-smart-assistant/skills/shadow
 */

/**
 * Which learned skill names lost the registry's name resolution.
 * @param winners - Resolved (winning) catalog as skill name → owning provider.
 * @param complete - Whether the catalog read completed; an incomplete read is a race, not a
 *   verdict, so it reports no shadows and lets the next curate try again.
 * @param learnedNames - Learned skill names found in the home's skills room.
 * @param learnedProvider - Provider name the learn module registers under.
 * @returns Learned names that will never load, mapped to the provider that owns the name.
 */
export function shadowedLearnedSkills(
  winners: ReadonlyMap<string, string>,
  complete: boolean,
  learnedNames: readonly string[],
  learnedProvider: string,
): Readonly<Record<string, string>> {
  if (!complete) return {}
  const shadowed: Record<string, string> = {}
  for (const name of learnedNames) {
    const winner = winners.get(name)
    // Absent from the catalog is a different failure (broken bundle, disabled skill) — the
    // curation scan's own findings cover it. Here we only name the silent-shadows case.
    if (winner !== undefined && winner !== learnedProvider) shadowed[name] = winner
  }
  return shadowed
}

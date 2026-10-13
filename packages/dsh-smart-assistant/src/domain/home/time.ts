/**
 * One day in milliseconds — the shared basis for every room's aging arithmetic.
 *
 * Deliberately only the constant: the per-room `ageInDays` helpers stay in their rooms,
 * because their NaN semantics differ on purpose (recall treats a bad timestamp as never
 * fading; the knowledge and home checks treat it as unmeasurable). Those are contracts,
 * not duplication — unifying them would change what each room reports on bad data.
 *
 * @module dsh-smart-assistant/home/time
 */

/** Milliseconds in one day. */
export const MS_PER_DAY = 24 * 60 * 60 * 1000

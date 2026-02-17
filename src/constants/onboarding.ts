/**
 * Map cycle display name to backend cycleId (for program list API).
 * Align with backend cycle seed/data.
 */
export const CYCLE_NAME_TO_ID: Record<string, number> = {
  Red: 1,
  Amber: 2,
  Green: 3,
}

/** Cycles that have programs; user must select a program when choosing manually. */
export const CYCLES_REQUIRING_PROGRAM = ['Red', 'Green']

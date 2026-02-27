/**
 * Map cycle display name to backend cycleId (for program list API).
 * Align with backend cycle seed/data (Red, Amber, Green, Sustainment).
 */
export const CYCLE_NAME_TO_ID: Record<string, number> = {
  Red: 1,
  Amber: 2,
  Green: 3,
  Sustainment: 4,
}

/**
 * Cycles that require a program when choosing manually (Sustainment program is optional).
 * Amber is not listed: V1 has one default Amber program (Warfighter); backend assigns it automatically on confirm.
 */
export const CYCLES_REQUIRING_PROGRAM = ['Red', 'Green']

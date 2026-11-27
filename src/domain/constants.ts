// Satisfies: NFR-004, DATA-001, EC-001
// Named domain constants with explicit units.

/** Coordinate rounding precision (DATA-001) - ~1.1 km precision at equator */
export const COORD_DECIMAL_PLACES = 2; // units: decimal places

/** Household profile size bounds */
export const MIN_PROFILE_MEMBERS = 1; // units: count
export const MAX_PROFILE_MEMBERS = 10; // units: count

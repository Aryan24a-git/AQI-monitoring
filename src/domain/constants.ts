// Satisfies: NFR-004, DATA-001, EC-001
// Named domain constants with explicit units.

/** Coordinate rounding precision (DATA-001) - ~1.1 km precision at equator */
export const COORD_DECIMAL_PLACES = 2; // units: decimal places

/** Household profile size bounds */
export const MIN_PROFILE_MEMBERS = 1; // units: count
export const MAX_PROFILE_MEMBERS = 10; // units: count

/** WAQI station freshness and proximity thresholds */
export const WAQI_STALE_HOURS = 3; // units: hours
export const WAQI_MAX_DISTANCE_KM = 25; // units: kilometres

/** Server-side LRU cache TTL for station & scenario lookups */
export const CACHE_TTL_MS = 15 * 60 * 1000; // units: milliseconds (15 min)

/** Ventilation window scoring weights (PM2.5 vs wind dispersion) */
export const VENT_PM25_WEIGHT = 0.75; // units: weight (dimensionless)
export const VENT_WIND_WEIGHT = 0.25; // units: weight (dimensionless)

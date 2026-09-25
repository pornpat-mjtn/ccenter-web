// Single source of truth for C Center's planning regions.
// Order here is the order shown in tabs, dashboard cards and dropdowns.
// To add a region: add it here. For a day-based region (like เหนือ/อีสาน/ใต้),
// also run /api/seed after deploy so its วันจันทร์–วันอาทิตย์ columns exist.
export const REGIONS = ['ภาคกลาง', 'ภาคตะวันออก', 'ภาคเหนือ', 'ภาคอีสาน', 'ภาคใต้']

// Regions whose board columns are days of the week instead of staff names.
export const DAY_BASED_REGIONS = REGIONS.filter(r => r !== 'ภาคกลาง')

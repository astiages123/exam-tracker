/**
 * Day Keys Constants
 * 
 * Centralized day mapping for schedule management.
 */

/**
 * Maps day index (0-6) to Turkish day names
 * Index 0 = Sunday, 6 = Saturday
 */
export const DAY_KEYS = [
    'CUMARTESİ / PAZAR', // 0: Sunday
    'PAZARTESİ',         // 1: Monday
    'SALI',              // 2: Tuesday
    'ÇARŞAMBA',          // 3: Wednesday
    'PERŞEMBE',          // 4: Thursday
    'CUMA',              // 5: Friday
    'CUMARTESİ / PAZAR'  // 6: Saturday
] as const;

export type DayKey = typeof DAY_KEYS[number];

/**
 * Default daily focus subjects when schedule is not set
 */
export const DEFAULT_SCHEDULE: Record<DayKey, string> = {
    'PAZARTESİ': 'EKONOMİ',
    'SALI': 'HUKUK',
    'ÇARŞAMBA': 'MUHASEBE - İŞLETME - MALİYE',
    'PERŞEMBE': 'EKONOMİ',
    'CUMA': 'HUKUK',
    'CUMARTESİ / PAZAR': 'MATEMATİK - BANKA',
};

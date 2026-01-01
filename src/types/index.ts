export * from '@/features/course/types';
export * from '@/features/ranks/types';
export * from '@/features/reports/types';
export * from '@/features/schedule/types';

export interface ActivityLogItem {
    date: string; // YYYY-MM-DD
    count: number; // completed videos + sessions?
    intensity: number; // 0-4
}

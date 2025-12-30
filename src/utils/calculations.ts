/**
 * Calculation Utility Functions
 * 
 * Centralized calculation helpers to reduce code duplication.
 */

import type { Course, UserProgressData } from '@/types';

/**
 * Calculates completed minutes for a specific course
 * 
 * @param course - The course to calculate for
 * @param completedIds - Array of completed video IDs
 * @returns Total completed minutes
 */
export const calculateCompletedMinutes = (
    course: Course,
    completedIds: number[]
): number => {
    const courseVideos = course.videos || [];
    return completedIds.reduce((acc, vidId) => {
        const video = courseVideos.find(v => v.id === vidId);
        if (video?.durationMinutes) {
            return acc + video.durationMinutes;
        }
        // Fallback: average duration
        const avgDuration = course.totalVideos > 0
            ? (course.totalHours * 60) / course.totalVideos
            : 0;
        return acc + avgDuration;
    }, 0);
};

/**
 * Calculates total completed hours for a category
 * 
 * @param courses - Array of courses in the category
 * @param progressData - User progress data
 * @returns Total completed hours
 */
export const calculateCategoryCompletedHours = (
    courses: Course[],
    progressData: UserProgressData
): number => {
    return courses.reduce((acc, course) => {
        const completedIds = progressData[course.id] || [];
        const minutes = calculateCompletedMinutes(course, completedIds);
        return acc + (minutes / 60);
    }, 0);
};

/**
 * Calculates course completion percentage
 * 
 * @param course - The course to calculate for
 * @param completedIds - Array of completed video IDs
 * @returns Percentage (0-100)
 */
export const calculateCoursePercentage = (
    course: Course,
    completedIds: number[]
): number => {
    const completedMinutes = calculateCompletedMinutes(course, completedIds);
    const completedHours = completedMinutes / 60;
    return course.totalHours > 0
        ? Math.round((completedHours / course.totalHours) * 100)
        : 0;
};

/**
 * Calculation Utilities Tests
 * 
 * Unit tests for calculation helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
    calculateCompletedMinutes,
    calculateCategoryCompletedHours,
    calculateCoursePercentage
} from '@/utils/calculations';
import type { Course } from '@/types';

// Mock course data
const mockCourse: Course = {
    id: 'test-course',
    name: 'Test Course',
    totalVideos: 5,
    totalHours: 2.5,
    videos: [
        { id: 1, title: 'Video 1', duration: '30:00', durationMinutes: 30 },
        { id: 2, title: 'Video 2', duration: '30:00', durationMinutes: 30 },
        { id: 3, title: 'Video 3', duration: '30:00', durationMinutes: 30 },
        { id: 4, title: 'Video 4', duration: '30:00', durationMinutes: 30 },
        { id: 5, title: 'Video 5', duration: '30:00', durationMinutes: 30 },
    ],
};

describe('calculateCompletedMinutes', () => {
    it('should return 0 for empty completed ids', () => {
        const result = calculateCompletedMinutes(mockCourse, []);
        expect(result).toBe(0);
    });

    it('should calculate correct minutes for completed videos', () => {
        const result = calculateCompletedMinutes(mockCourse, [1, 2]);
        expect(result).toBe(60); // 30 + 30
    });

    it('should calculate correct minutes for all videos', () => {
        const result = calculateCompletedMinutes(mockCourse, [1, 2, 3, 4, 5]);
        expect(result).toBe(150); // 5 * 30
    });

    it('should use fallback for missing video data', () => {
        const courseWithoutDurations: Course = {
            ...mockCourse,
            videos: [{ id: 1, title: 'Video 1', duration: '30:00', durationMinutes: 0 }],
        };
        const result = calculateCompletedMinutes(courseWithoutDurations, [1]);
        // Fallback: (2.5 * 60) / 5 = 30
        expect(result).toBe(30);
    });
});

describe('calculateCategoryCompletedHours', () => {
    it('should return 0 for empty progress data', () => {
        const result = calculateCategoryCompletedHours([mockCourse], {});
        expect(result).toBe(0);
    });

    it('should calculate correct hours for partial completion', () => {
        const result = calculateCategoryCompletedHours([mockCourse], {
            'test-course': [1, 2]
        });
        expect(result).toBe(1); // 60 minutes = 1 hour
    });
});

describe('calculateCoursePercentage', () => {
    it('should return 0 for no completion', () => {
        const result = calculateCoursePercentage(mockCourse, []);
        expect(result).toBe(0);
    });

    it('should return 100 for full completion', () => {
        const result = calculateCoursePercentage(mockCourse, [1, 2, 3, 4, 5]);
        expect(result).toBe(100);
    });

    it('should return correct percentage for partial completion', () => {
        const result = calculateCoursePercentage(mockCourse, [1, 2]);
        // 60 minutes = 1 hour, total = 2.5 hours
        // 1 / 2.5 * 100 = 40%
        expect(result).toBe(40);
    });
});

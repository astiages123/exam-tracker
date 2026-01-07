import CategoryItem from '@/features/course/components/CategoryItem';
import type { Course, CourseCategory, UserProgressData } from '@/types';

interface CategoryListProps {
    courseData: CourseCategory[];
    progressData: UserProgressData;
    expandedCategories: Set<string>;
    expandedCourses: Set<string>;
    handlers: {
        toggleCategory: (categoryId: string) => void;
        toggleCourse: (courseId: string) => void;
        handleVideoClick: (e: React.MouseEvent, courseId: string, videoId: number) => void;
    };
    modals: {
        openNotes: (course: Course) => void;
        openQuiz: (course: Course) => void;
        openStats: (course: Course) => void;
    };
}

export default function CategoryList({
    courseData,
    progressData,
    expandedCategories,
    expandedCourses,
    handlers,
    modals
}: CategoryListProps) {
    return (
        <>
            {courseData.map((category, catIdx) => (
                <CategoryItem
                    key={category.category}
                    category={category}
                    catIdx={catIdx}
                    progressData={progressData}
                    isExpanded={expandedCategories.has(String(catIdx))}
                    expandedCourses={expandedCourses}
                    handlers={handlers}
                    modals={modals}
                />
            ))}
        </>
    );
}

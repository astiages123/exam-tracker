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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 items-start">
            {courseData.map((category, catIdx) => (
                <CategoryItem
                    key={category.category} // Changed to stable string key if possible, falling back to catIdx if needed but category name is better
                    category={category}
                    catIdx={catIdx}
                    progressData={progressData}
                    isExpanded={expandedCategories.has(String(catIdx))}
                    expandedCourses={expandedCourses}
                    handlers={handlers}
                    modals={modals}
                />
            ))}
        </div>
    );
}

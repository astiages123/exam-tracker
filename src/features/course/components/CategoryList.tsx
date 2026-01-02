import CategoryItem from '@/features/course/components/CategoryItem';
import { CourseCategory, UserProgressData } from '@/types';

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
        openNotes: (course: any) => void;
        openQuiz: (course: any) => void;
        openStats: (course: any) => void;
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 items-start">
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
        </div>
    );
}

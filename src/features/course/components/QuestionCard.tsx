/**
 * QuestionCard - Soru Kartı Bileşeni
 * ===================================
 */

import type { ContentBlock } from '../types/content';
import { MathAwareHtml } from '../../../components/ui/MathAwareHtml';

interface QuestionCardProps {
    block: ContentBlock;
    className?: string;
}

export function QuestionCard({ block, className = '' }: QuestionCardProps) {
    const title = block.metadata?.title || 'Soru';
    const number = block.metadata?.number;
    const displayTitle = number ? `${title} ${number}` : title;

    return (
        <div className={`note-card question-card ${className}`}>
            <span className="card-badge question-title">{displayTitle}</span>

            {block.children && block.children.length > 0 && (
                <div className="question-content">
                    {block.children.map((child) => (
                        <MathAwareHtml
                            key={child.id}
                            className="question-child"
                            html={child.content}
                        />
                    ))}
                </div>
            )}

            {!block.children?.length && block.content && (
                <MathAwareHtml
                    className="question-content"
                    html={block.content}
                />
            )}
        </div>
    );
}

export default QuestionCard;

/**
 * SolutionCard - Çözüm Kartı Bileşeni
 * ====================================
 */

import type { ContentBlock } from '../types/content';
import { MathAwareHtml } from '../../../components/ui/MathAwareHtml';

interface SolutionCardProps {
    block: ContentBlock;
    className?: string;
}

export function SolutionCard({ block, className = '' }: SolutionCardProps) {
    const title = block.metadata?.title || 'Çözüm';
    const number = block.metadata?.number;
    const displayTitle = number ? `${title} ${number}` : title;

    return (
        <div className={`note-card solution-card ${className}`}>
            <span className="card-badge solution-title">{displayTitle}</span>

            {block.children && block.children.length > 0 && (
                <div className="solution-content">
                    {block.children.map((child) => (
                        <MathAwareHtml
                            key={child.id}
                            className="solution-child"
                            html={child.content}
                        />
                    ))}
                </div>
            )}

            {!block.children?.length && block.content && (
                <MathAwareHtml
                    className="solution-content"
                    html={block.content}
                />
            )}
        </div>
    );
}

export default SolutionCard;

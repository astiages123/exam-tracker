/**
 * ExampleCard - Örnek Kartı Bileşeni
 * ===================================
 */

import type { ContentBlock } from '../types/content';
import { MathAwareHtml } from '../../../components/ui/MathAwareHtml';

interface ExampleCardProps {
    block: ContentBlock;
    className?: string;
}

export function ExampleCard({ block, className = '' }: ExampleCardProps) {
    const title = block.metadata?.title || 'Örnek';
    const number = block.metadata?.number;
    const displayTitle = number ? `${title} ${number}` : title;

    return (
        <div className={`note-card example-card ${className}`}>
            <span className="card-badge example-title">{displayTitle}</span>

            {block.children && block.children.length > 0 && (
                <div className="example-content">
                    {block.children.map((child) => (
                        <MathAwareHtml
                            key={child.id}
                            className="example-child"
                            html={child.content}
                        />
                    ))}
                </div>
            )}

            {!block.children?.length && block.content && (
                <MathAwareHtml
                    className="example-content"
                    html={block.content}
                />
            )}
        </div>
    );
}

export default ExampleCard;

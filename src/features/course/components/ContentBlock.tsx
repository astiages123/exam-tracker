/**
 * ContentBlock - Ana İçerik Render Bileşeni
 * ==========================================
 * Block tipine göre uygun React bileşenini render eder.
 */

import type { ContentBlock as ContentBlockType } from '../types/content';
import { ExampleCard } from './ExampleCard.tsx';
import { QuestionCard } from './QuestionCard.tsx';
import { SolutionCard } from './SolutionCard.tsx';
import { TableBlock } from './TableBlock.tsx';
import { MathBlock } from './MathBlock.tsx';
import { MathAwareHtml } from '../../../components/ui/MathAwareHtml';
import '../styles/course-content.css';

interface ContentBlockProps {
    block: ContentBlockType;
    className?: string;
}

/**
 * Tek bir içerik bloğunu render eder
 */
export function ContentBlock({ block, className = '' }: ContentBlockProps) {
    const hasFormula = block.metadata?.hasFormula;

    switch (block.type) {
        case 'example':
            return <ExampleCard block={block} className={className} />;

        case 'question':
            return <QuestionCard block={block} className={className} />;

        case 'solution':
            return <SolutionCard block={block} className={className} />;

        case 'table':
            return <TableBlock block={block} className={className} />;

        case 'math':
            return <MathBlock content={block.content} display={true} className={className} />;

        case 'math-inline':
            return <MathBlock content={block.content} display={false} className={className} />;

        case 'heading':
            return <HeadingBlock block={block} className={className} />;

        case 'paragraph':
            if (hasFormula) {
                return <MathAwareHtml html={block.content} className={`content-paragraph ${className}`} />;
            }
            return (
                <div
                    className={`content-paragraph ${className}`}
                    dangerouslySetInnerHTML={{ __html: block.content }}
                />
            );

        case 'list':
            if (hasFormula) {
                return <MathAwareHtml html={block.content} className={`content-list ${className}`} />;
            }
            return (
                <div
                    className={`content-list ${className}`}
                    dangerouslySetInnerHTML={{ __html: block.content }}
                />
            );

        case 'blockquote':
            if (hasFormula) {
                return <MathAwareHtml as="blockquote" html={block.content} className={`content-blockquote ${className}`} />;
            }
            return (
                <blockquote
                    className={`content-blockquote ${className}`}
                    dangerouslySetInnerHTML={{ __html: block.content }}
                />
            );

        case 'image':
            return <ImageBlock block={block} className={className} />;

        case 'raw-html':
        default:
            return (
                <div
                    className={`content-raw ${className}`}
                    dangerouslySetInnerHTML={{ __html: block.content }}
                />
            );
    }
}

/**
 * Başlık bloğu
 */
function HeadingBlock({ block, className }: ContentBlockProps) {
    const level = block.level || 2;
    const title = block.metadata?.title as string || '';

    // Dynamic heading element
    const HeadingTag = ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => {
        switch (level) {
            case 1: return <h1 {...props}>{children}</h1>;
            case 2: return <h2 {...props}>{children}</h2>;
            case 3: return <h3 {...props}>{children}</h3>;
            case 4: return <h4 {...props}>{children}</h4>;
            case 5: return <h5 {...props}>{children}</h5>;
            case 6: return <h6 {...props}>{children}</h6>;
            default: return <h2 {...props}>{children}</h2>;
        }
    };

    return (
        <HeadingTag
            className={`content-heading content-h${level} ${className}`}
            id={block.id}
        >
            {title || <span dangerouslySetInnerHTML={{ __html: block.content }} />}
        </HeadingTag>
    );
}

/**
 * Görsel bloğu
 */
function ImageBlock({ block, className }: ContentBlockProps) {
    const path = block.metadata?.path as string || '';
    const alt = block.metadata?.alt as string || 'Görsel';

    return (
        <figure className={`content-image ${className}`}>
            <img src={path} alt={alt} loading="lazy" />
            {alt && alt !== 'Görsel' && <figcaption>{alt}</figcaption>}
        </figure>
    );
}

/**
 * Birden fazla bloğu render eder
 */
export function ContentBlocks({ blocks }: { blocks: ContentBlockType[] }) {
    return (
        <div className="content-blocks course-content">
            {blocks.map((block) => (
                <ContentBlock key={block.id} block={block} />
            ))}
        </div>
    );
}

export default ContentBlock;

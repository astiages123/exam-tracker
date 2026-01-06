/**
 * TableBlock - Tablo Bileşeni
 * ============================
 */

import type { ContentBlock } from '../types/content';

interface TableBlockProps {
    block: ContentBlock;
    className?: string;
}

export function TableBlock({ block, className = '' }: TableBlockProps) {
    return (
        <div className={`table-wrapper ${className}`}>
            <div dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
    );
}

export default TableBlock;

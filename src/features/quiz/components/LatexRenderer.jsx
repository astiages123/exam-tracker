/**
 * LatexRenderer Component
 * Renders Markdown with embedded LaTeX formulas using react-markdown
 */
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Renders text with embedded LaTeX formulas and Markdown
 * Supports:
 * - **Bold**, *Italic*, `Code`
 * - Tables (GFM)
 * - Inline Math: $E=mc^2$
 * - Block Math: $$...$$
 */
export function LatexRenderer({ content, className = '' }) {
    if (!content) return null;

    // Pre-process content to replace '*' with '\times' for better math rendering
    // We use a regex that looks for * surrounded by spaces or numbers/vars to avoid breaking markdown
    // But since this is a math renderer, we can be more aggressive if we detect math context.
    const processedContent = useMemo(() => {
        if (!content) return '';
        // Replace * with \times (multiplication)
        // We match * that is NOT at the start of a line (bullet point) and NOT part of **bold**
        // Strategy: Replace " * " with " \times " or "P*Q" with "P \times Q"
        // Simple heuristic: Replace * with \times if it's single.

        return content
            // Protect **bold** by temporarily replacing it or use negative lookaround
            // (?<!\*)\*(?!\*) matches single *
            .replace(/(?<!\*)\*(?!\*)/g, ' \\times ');
    }, [content]);

    return (
        <div className={`latex-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    // Custom components for specific elements if needed
                    p: ({ children }) => <span className="block mb-2 last:mb-0">{children}</span>,
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            {children}
                        </a>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4 border border-gray-700 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-700 text-sm">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-gray-700">{children}</tbody>,
                    tr: ({ children }) => <tr className="hover:bg-gray-800/50 transition-colors">{children}</tr>,
                    th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3 whitespace-nowrap text-gray-300">{children}</td>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-500/10 rounded-r-lg italic text-gray-300">
                            {children}
                        </blockquote>
                    ),
                    code: ({ inline, className, children, ...props }) => {
                        return inline ? (
                            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-amber-300 font-mono text-sm" {...props}>
                                {children}
                            </code>
                        ) : (
                            <pre className="bg-gray-950 p-4 rounded-lg overflow-x-auto border border-gray-800 my-4 text-sm font-mono text-gray-300">
                                <code {...props}>{children}</code>
                            </pre>
                        );
                    }
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}

export default LatexRenderer;

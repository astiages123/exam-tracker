import { renderMathText } from '../utils/mathText';

/**
 * React bileşeni olarak matematik metni render eder
 */
export default function MathText({ children, className = '' }) {
    if (!children) return null;

    const rendered = renderMathText(children);

    return <span className={className}>{rendered}</span>;
}

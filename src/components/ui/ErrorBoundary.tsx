/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to console (can be replaced with error reporting service)
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-destructive/5 border border-destructive/20 rounded-xl">
                    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-lg font-semibold text-destructive mb-2">
                        Bir Hata Oluştu
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                        Bu bileşen yüklenirken beklenmeyen bir hata meydana geldi.
                    </p>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre className="text-xs bg-black/10 p-3 rounded-lg mb-4 max-w-full overflow-auto">
                            {this.state.error.message}
                        </pre>
                    )}
                    <Button
                        onClick={this.handleReset}
                        variant="outline"
                        className="gap-2"
                    >
                        <RefreshCw size={16} />
                        Tekrar Dene
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

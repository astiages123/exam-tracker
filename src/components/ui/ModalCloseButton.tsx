import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface ModalCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { }

const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({ className, ...props }) => {
    return (
        <button
            className={cn(
                "rounded-full p-2 hover:bg-muted transition-colors",
                className
            )}
            {...props}
        >
            <X className="h-5 w-5 text-muted-foreground" />
        </button>
    );
};

export default ModalCloseButton;

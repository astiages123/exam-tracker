import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface ModalCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { }

const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({ className, ...props }) => {
    return (
        <button
            className={cn(
                "rounded-full h-10 w-10 flex items-center justify-center hover:bg-muted transition-colors",
                className
            )}
            {...props}
        >
            <X size={26} className="text-muted-foreground" />
        </button>
    );
};

export default ModalCloseButton;

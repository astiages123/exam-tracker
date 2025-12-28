import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ModalCloseButton = ({ className, ...props }) => {
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

import React from 'react';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ModalCloseButton = React.forwardRef(({ className, onClick, ...props }, ref) => {
    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={cn(
                "h-10 w-10 round-full hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 outline-none shrink-0 [&_svg]:size-6",
                className
            )}
            {...props}
        >
            <X size={24} />
            <span className="sr-only">Kapat</span>
        </Button>
    );
});

ModalCloseButton.displayName = "ModalCloseButton";

export default ModalCloseButton;

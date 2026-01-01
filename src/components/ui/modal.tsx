import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import ModalCloseButton from "@/components/ui/ModalCloseButton";

interface ModalProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    className?: string; // Content className
    closeButton?: boolean;
}

export function Modal({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    children,
    footer,
    className,
    closeButton = true,
}: ModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent
                className={cn(
                    "sm:max-w-lg w-full p-6 bg-card border-border shadow-xl sm:rounded-xl",
                    className
                )}
            >
                {(title || description || closeButton) && (
                    <DialogHeader>
                        {title && <DialogTitle>{title}</DialogTitle>}
                        {description && <DialogDescription>{description}</DialogDescription>}
                        {closeButton && (
                            <div className="absolute right-4 top-4">
                                <ModalCloseButton onClick={() => onOpenChange?.(false)} />
                            </div>
                        )}
                    </DialogHeader>
                )}

                {children}

                {footer && <DialogFooter>{footer}</DialogFooter>}
            </DialogContent>
        </Dialog>
    );
}

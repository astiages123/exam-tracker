import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './dialog';

const ConfirmModal = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Onayla",
    cancelText = "İptal",
    variant = "destructive"
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-md p-6 bg-card border-border shadow-2xl sm:rounded-xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-amber-500/20">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <DialogTitle className="text-lg font-semibold text-foreground">{title}</DialogTitle>
                    </div>
                    <DialogDescription className="text-muted-foreground text-left">
                        {message}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-3 justify-end mt-4">
                    <Button variant="outline" onClick={onCancel} className="px-4 py-2 rounded-xl">
                        {cancelText}
                    </Button>
                    <Button variant={variant} onClick={onConfirm} className="px-4 py-2 rounded-xl">
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmModal;

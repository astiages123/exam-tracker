import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Evet, Onayla', cancelText = 'İptal' }) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {title || 'Emin misiniz?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {message || 'Bu işlemi yapmak istediğinize emin misiniz?'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>{cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            // Prevent default closing if handled by onConfirm? No, Shadcn Action closes automatically.
                            // If onConfirm is async, we might want to wait? 
                            // Legacy modal didn't handle async explicitly.
                            onConfirm();
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

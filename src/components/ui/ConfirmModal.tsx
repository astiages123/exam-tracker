import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Modal } from './modal';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

const ConfirmModal = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Onayla",
    cancelText = "İptal",
    variant = "destructive"
}: ConfirmModalProps) => {
    return (
        <Modal
            open={isOpen}
            onOpenChange={(open) => !open && onCancel()}
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-500/20">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <span>{title}</span>
                </div>
            }
            description={message}
            className="max-w-md"
            footer={
                <div className="flex gap-3 justify-end w-full">
                    <Button variant={variant} onClick={onConfirm} className="px-4 py-2 rounded-xl">
                        {confirmText}
                    </Button>
                    <Button variant="outline" onClick={onCancel} className="px-4 py-2 rounded-xl">
                        {cancelText}
                    </Button>
                </div>
            }
        />
    );
};

export default ConfirmModal;

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastData {
    id: string;
    message: string;
    type: ToastType;
}

interface ConfirmState {
    isOpen: boolean;
    title: string;
    message: string;
    resolve: ((value: boolean) => void) | null;
}

interface NotificationContextType {
    showToast: (message: string, type?: ToastType) => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType>({
    showToast: () => { },
    showConfirm: () => Promise.resolve(false)
});

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    // Toast State
    const [toasts, setToasts] = useState<ToastData[]>([]);

    // Confirm Modal State
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        title: '',
        message: '',
        resolve: null
    });

    // --- Toast Logic ---
    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // --- Confirm Modal Logic ---
    const showConfirm = useCallback((title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                resolve
            });
        });
    }, []);

    const handleConfirm = () => {
        if (confirmState.resolve) confirmState.resolve(true);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    const handleCancel = () => {
        if (confirmState.resolve) confirmState.resolve(false);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    const value = React.useMemo(() => ({ showToast, showConfirm }), [showToast, showConfirm]);

    return (
        <NotificationContext.Provider value={value}>
            {children}

            {/* Toast Container - Fixed Position */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            id={toast.id}
                            message={toast.message}
                            type={toast.type}
                            onClose={removeToast}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </NotificationContext.Provider>
    );
};

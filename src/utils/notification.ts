export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
};

export const sendNotification = (title: string, options: NotificationOptions = {}) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        const notification = new Notification(title, {
            vibrate: [200, 100, 200], // Vibration pattern for mobile
            ...options
        } as any);

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto close after 5 seconds to be polite
        setTimeout(() => notification.close(), 5000);
    }
};

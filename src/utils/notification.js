export const requestNotificationPermission = async () => {
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

export const sendNotification = (title, options = {}) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        const notification = new Notification(title, {
            icon: '/icon.png', // Fallback, though we might not have one yet
            vibrate: [200, 100, 200], // Vibration pattern for mobile
            badge: '/icon.png',
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto close after 5 seconds to be polite
        setTimeout(() => notification.close(), 5000);
    }
};

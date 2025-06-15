import React, { useEffect, useRef } from "react";
import { useAppStore } from "@/store/main";

interface NotificationType {
  notification_id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
  timestamp: string;
}

const GV_Notifications: React.FC = () => {
  const notifications = useAppStore((state) => state.notification_state) as NotificationType[];
  const removeNotification = useAppStore((state) => state.remove_notification);
  // Ref to track scheduled auto-clear timers by notification id
  const scheduledTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    // Schedule auto-clear for each new notification
    notifications.forEach((notification) => {
      if (!scheduledTimers.current[notification.notification_id]) {
        const timer = setTimeout(() => {
          removeNotification(notification.notification_id);
          delete scheduledTimers.current[notification.notification_id];
        }, 5000);
        scheduledTimers.current[notification.notification_id] = timer;
      }
    });
    // Clean up timers for notifications that have been removed from the state
    Object.keys(scheduledTimers.current).forEach((id) => {
      if (!notifications.find((n) => n.notification_id === id)) {
        clearTimeout(scheduledTimers.current[id]);
        delete scheduledTimers.current[id];
      }
    });
    return () => {
      // Clear all timers on unmount
      Object.values(scheduledTimers.current).forEach((timer) => {
        clearTimeout(timer);
      });
      scheduledTimers.current = {};
    };
  }, [notifications, removeNotification]);

  // Function to return Tailwind CSS classes based on notification type
  const getNotificationStyle = (type: 'success' | 'error' | 'warning'): string => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.notification_id}
          role="alert"
          className={`max-w-sm w-full border-l-4 p-4 ${getNotificationStyle(notification.type)} shadow-md rounded`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm">{notification.message}</p>
              <p className="text-xs mt-1 opacity-75">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => removeNotification(notification.notification_id)}
              className="ml-4 text-lg font-bold focus:outline-none"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GV_Notifications;
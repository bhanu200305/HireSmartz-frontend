import { useEffect } from 'react';
import { showToast } from '../components';

const connectionState = {
  listenersAttached: false,
  lastNotifiedStatus: navigator.onLine,
};

const NOTIFICATIONS = {
  CONNECTED: {
    message: 'Connection restored',
    type: 'success' as const,
  },
  DISCONNECTED: {
    message: 'No internet connection. Please try again.',
    type: 'error' as const,
  },
} as const;

const showNotification = (isOnline: boolean): void => {
  const notification = isOnline ? NOTIFICATIONS.CONNECTED : NOTIFICATIONS.DISCONNECTED;
  showToast({
    message: notification.message,
    type: notification.type,
  });
};

const handleStatusChange = (): void => {
  if (document.hidden) return;

  const currentStatus = navigator.onLine;
  if (connectionState.lastNotifiedStatus !== currentStatus) {
    connectionState.lastNotifiedStatus = currentStatus;
    showNotification(currentStatus);
  }
};

const handleVisibilityChange = (): void => {
  if (document.hidden) return;

  const currentStatus = navigator.onLine;
  if (connectionState.lastNotifiedStatus !== currentStatus) {
    connectionState.lastNotifiedStatus = currentStatus;
    showNotification(currentStatus);
  }
};

export const useInternetConnection = () => {
  useEffect(() => {
    if (!connectionState.listenersAttached) {
      window.addEventListener('online', handleStatusChange);
      window.addEventListener('offline', handleStatusChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      connectionState.listenersAttached = true;
    }

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      connectionState.listenersAttached = false;
    };
  }, []);

  return {
    isOnline: (): boolean => navigator.onLine,
  };
};

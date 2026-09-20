import { create } from 'zustand';
import { mockGetNotifications, mockMarkAsRead, type MockNotification } from '@/data/mockData';

interface NotificationsState {
  notifications: MockNotification[];
  unreadCount: number;
  fetchNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  startPolling: () => () => void; // Returns cleanup function
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  fetchNotifications: () => {
    const notifications = [...mockGetNotifications()];
    const unreadCount = notifications.filter(n => !n.read).length;
    set({ notifications, unreadCount });
  },

  markAsRead: (id: string) => {
    mockMarkAsRead(id);
    const notifications = [...mockGetNotifications()];
    const unreadCount = notifications.filter(n => !n.read).length;
    set({ notifications, unreadCount });
  },

  markAllAsRead: () => {
    const { notifications } = get();
    notifications.forEach(n => {
      if (!n.read) mockMarkAsRead(n._id);
    });
    const updated = [...mockGetNotifications()];
    set({ notifications: updated, unreadCount: 0 });
  },

  startPolling: () => {
    get().fetchNotifications();
    // Simulate incoming notifications every 30 seconds
    const interval = setInterval(() => {
      get().fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }
}));

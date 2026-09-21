import { create } from 'zustand';
import { api } from '@/services/api';

import type { MockNotification } from '@/data/mockData';

interface NotificationsState {
  notifications: MockNotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  startPolling: () => () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const token = typeof window !== 'undefined' && typeof localStorage !== 'undefined' ? localStorage.getItem('chroniq_token') : null;
      if (!token) {
        set({ notifications: [], unreadCount: 0 });
        return;
      }
      const res = await api.get('/notifications');
      if (Array.isArray(res.data)) {
        const mapped: MockNotification[] = res.data.map((n: any) => ({
          _id: n.id,
          type: n.type || 'general',
          title: n.title,
          body: n.message,
          time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          read: Boolean(n.read),
        }));
        const unreadCount = mapped.filter(n => !n.read).length;
        set({ notifications: mapped, unreadCount });
      } else {
        set({ notifications: [], unreadCount: 0 });
      }
    } catch {
      set({ notifications: [], unreadCount: 0 });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {}
    set(state => {
      const updated = state.notifications.map(n => n._id === id ? { ...n, read: true } : n);
      return { notifications: updated, unreadCount: updated.filter(n => !n.read).length };
    });
  },

  markAllAsRead: async () => {
    const unread = get().notifications.filter(n => !n.read);
    await Promise.allSettled(unread.map(n => api.patch(`/notifications/${n._id}/read`)));
    set(state => {
      const updated = state.notifications.map(n => ({ ...n, read: true }));
      return { notifications: updated, unreadCount: 0 };
    });
  },

  startPolling: () => {
    get().fetchNotifications();
    const interval = setInterval(() => {
      get().fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }
}));


import { create } from 'zustand';
import { notificationService } from '../services/notificationService';

const useNotificationState = create((set) => ({
  unreadCount: 0,
  notifications: [],
  loading: false,
  hasFetchedNotifications: false,
  
  // Set unread count 
  setUnreadCount: (count) => set({ unreadCount: count }),
  
  // Increment unread count by a specific amount
  incrementUnreadCount: (amount = 1) => set((state) => ({ 
    unreadCount: state.unreadCount + amount 
  })),
  
  // Fetch initial unread count when page loads
  fetchInitialUnreadCount: async () => {
    try {
      const count = await notificationService.loadInitialUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Error loading initial unread count:', error);
    }
  },
  
  // Set notifications array
  setNotifications: (notifications) => set({ 
    notifications,
    hasFetchedNotifications: true
  }),
  
  // Add new notification to the top of the list
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),
  
  // Mark notifications as viewed
  markAsViewed: async (notificationIds) => {
    try {
      await notificationService.markAsViewed(notificationIds);
      
      set((state) => ({
        unreadCount: Math.max(0, state.unreadCount - notificationIds.length),
        notifications: state.notifications.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, is_viewed: true }
            : notification
        )
      }));
    } catch (error) {
      console.error('Error marking notifications as viewed:', error);
    }
  },
  
  // Mark notification as opened
  markAsOpened: async (notificationId) => {
    try {
      await notificationService.markAsOpened(notificationId);
      
      set((state) => ({
        notifications: state.notifications.map(notification => 
          notification.id === notificationId
            ? { ...notification, is_opened: true }
            : notification
        )
      }));
    } catch (error) {
      console.error('Error marking notification as opened:', error);
    }
  },
  
  // Fetch notifications from API
  fetchNotifications: async () => {
    try {
      set({ loading: true });
      const data = await notificationService.getNotifications();
      set({ 
        notifications: data.notifications || [],
        hasFetchedNotifications: true,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ loading: false });
    }
  },
  
  // Used to reset the state when needed
  reset: () => set({
    unreadCount: 0,
    notifications: [],
    loading: false,
    hasFetchedNotifications: false
  })
}));

export default useNotificationState; 
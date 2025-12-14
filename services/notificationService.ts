/**
 * Notification Service - Push Notifications & In-App Alerts
 * Handles browser notifications, in-app toasts, and push notifications
 * Now with Supabase persistence
 */

import { supabase } from '../supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
    read: boolean;
    actionUrl?: string;
    data?: any;
}

type NotificationHandler = (notification: Notification) => void;

class NotificationService {
    private notifications: Notification[] = [];
    private handlers: Set<NotificationHandler> = new Set();
    private permission: NotificationPermission = 'default';
    private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
    private realtimeChannel: RealtimeChannel | null = null;

    constructor() {
        this.checkPermission();
        this.registerServiceWorker();
    }

    /**
     * Check browser notification permission
     */
    private checkPermission(): void {
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    /**
     * Request notification permission
     */
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('Browser does not support notifications');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        try {
            const result = await Notification.requestPermission();
            this.permission = result;
            return result === 'granted';
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            return false;
        }
    }

    /**
     * Register service worker for push notifications
     */
    private async registerServiceWorker(): Promise<void> {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        try {
            this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered successfully');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    /**
     * Show browser notification
     */
    async showNotification(
        title: string,
        options?: NotificationOptions
    ): Promise<void> {
        if (this.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) {
                console.warn('Notification permission denied');
                return;
            }
        }

        if (this.serviceWorkerRegistration) {
            // Use service worker for persistent notifications
            await this.serviceWorkerRegistration.showNotification(title, {
                icon: '/icon-192.png',
                badge: '/badge-72.png',
                vibrate: [200, 100, 200] as any,
                ...options,
            });
        } else {
            // Fallback to regular notification
            new Notification(title, {
                icon: '/icon-192.png',
                ...options,
            });
        }
    }

    /**
     * Add a notification to the in-app notification center
     */
    async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> {
        const fullNotification: Notification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            read: false,
        };

        // Save to Supabase first
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('notifications').insert({
                    user_id: user.id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    action_url: notification.actionUrl,
                });
            }
        } catch (error) {
            console.error('Failed to save notification to Supabase:', error);
        }

        this.notifications.unshift(fullNotification);

        // Limit to 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }

        // Notify all handlers
        this.handlers.forEach((handler) => {
            try {
                handler(fullNotification);
            } catch (error) {
                console.error('Error in notification handler:', error);
            }
        });

        return fullNotification;
    }

    /**
     * Subscribe to notification updates
     */
    subscribe(handler: NotificationHandler): () => void {
        this.handlers.add(handler);
        
        // Return unsubscribe function
        return () => {
            this.handlers.delete(handler);
        };
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        const notification = this.notifications.find((n) => n.id === notificationId);
        if (notification) {
            notification.read = true;
            
            // Update in Supabase
            try {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', notificationId);
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        this.notifications.forEach((n) => {
            n.read = true;
        });
        
        // Update all in Supabase
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false);
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }

    /**
     * Get all notifications
     */
    getNotifications(): Notification[] {
        return [...this.notifications];
    }

    /**
     * Get unread notifications
     */
    getUnreadNotifications(): Notification[] {
        return this.notifications.filter((n) => !n.read);
    }

    /**
     * Get unread count
     */
    getUnreadCount(): number {
        return this.notifications.filter((n) => !n.read).length;
    }

    /**
     * Clear a specific notification
     */
    async clearNotification(notificationId: string): Promise<void> {
        this.notifications = this.notifications.filter((n) => n.id !== notificationId);
        try {
            await supabase.from('notifications').delete().eq('id', notificationId);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }

    /**
     * Clear all notifications
     */
    async clearAllNotifications(): Promise<void> {
        this.notifications = [];
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('notifications').delete().eq('user_id', user.id);
            }
        } catch (error) {
            console.error('Failed to delete all notifications:', error);
        }
    }

    /**
     * Load notifications from Supabase
     */
    async loadNotifications(): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Failed to load notifications from Supabase:', error);
                return;
            }

            this.notifications = (data || []).map((n: any) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type || 'info',
                timestamp: new Date(n.created_at).getTime(),
                read: n.is_read,
                actionUrl: n.action_url,
            }));

            // Setup real-time subscription
            this.setupRealtimeSubscription(user.id);
        } catch (error) {
            console.error('Failed to load notifications:', error);
            this.notifications = [];
        }
    }

    /**
     * Setup real-time subscription for notifications
     */
    private setupRealtimeSubscription(userId: string): void {
        if (this.realtimeChannel) {
            supabase.removeChannel(this.realtimeChannel);
        }

        this.realtimeChannel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        const newNotification: Notification = {
                            id: payload.new.id,
                            title: payload.new.title,
                            message: payload.new.message,
                            type: payload.new.type || 'info',
                            timestamp: new Date(payload.new.created_at).getTime(),
                            read: payload.new.is_read,
                            actionUrl: payload.new.action_url,
                        };
                        this.notifications.unshift(newNotification);
                        this.handlers.forEach((handler) => {
                            try {
                                handler(newNotification);
                            } catch (error) {
                                console.error('Error in notification handler:', error);
                            }
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const notification = this.notifications.find((n) => n.id === payload.new.id);
                        if (notification) {
                            notification.read = payload.new.is_read;
                        }
                    } else if (payload.eventType === 'DELETE') {
                        this.notifications = this.notifications.filter((n) => n.id !== payload.old.id);
                    }
                }
            )
            .subscribe();
    }

    /**
     * Subscribe to push notifications via backend
     */
    async subscribeToPush(): Promise<boolean> {
        if (!this.serviceWorkerRegistration) {
            console.error('Service Worker not registered');
            return false;
        }

        try {
            const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
                ),
            });

            // Send subscription to backend
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(subscription),
            });

            return true;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            return false;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribeFromPush(): Promise<boolean> {
        if (!this.serviceWorkerRegistration) {
            return false;
        }

        try {
            const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
            
            if (subscription) {
                await subscription.unsubscribe();

                // Notify backend
                await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/unsubscribe`, {
                    method: 'POST',
                    credentials: 'include',
                });
            }

            return true;
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            return false;
        }
    }

    /**
     * Convert VAPID key to Uint8Array
     */
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }

    /**
     * Check if notifications are supported
     */
    isSupported(): boolean {
        return 'Notification' in window;
    }

    /**
     * Check if push notifications are supported
     */
    isPushSupported(): boolean {
        return 'serviceWorker' in navigator && 'PushManager' in window;
    }

    /**
     * Get notification permission status
     */
    getPermission(): NotificationPermission {
        return this.permission;
    }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Load notifications on initialization
notificationService.loadNotifications();

export default notificationService;

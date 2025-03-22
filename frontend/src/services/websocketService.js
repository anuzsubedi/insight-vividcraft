class WebSocketService {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.handlers = new Map();
        this.isConnecting = false;
        this.token = null;
        this.connectionTimeout = null;
        this.isPageLoading = true;
        this.pendingReconnect = false;
        this.lastPong = Date.now();
        this.pingInterval = null;

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.token && !this.ws) {
                this.connect(this.token);
            }
        });

        // Handle beforeunload
        window.addEventListener('beforeunload', () => {
            this.isPageLoading = true;
            this.disconnect();
        });
    }

    connect(token) {
        if (!token) {
            console.error('No token provided for WebSocket connection');
            return;
        }

        if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connecting or connected');
            return;
        }

        this.isConnecting = true;
        this.token = token;
        this.isPageLoading = false;
        const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:5000'}/ws?token=${encodeURIComponent(token)}`;
        console.log('Connecting to WebSocket:', wsUrl);
        
        try {
            this.ws = new WebSocket(wsUrl);

            // Set connection timeout
            this.connectionTimeout = setTimeout(() => {
                if (this.ws?.readyState !== WebSocket.OPEN) {
                    console.error('WebSocket connection timeout');
                    this.ws.close();
                }
            }, 5000);

            this.ws.onopen = () => {
                console.log('WebSocket connected successfully');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.pendingReconnect = false;
                this.lastPong = Date.now();
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
                this.setupPingInterval();
                // Request initial data
                this.getPreferences();
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                });
                this.isConnecting = false;
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
                
                // Only attempt reconnect if not during page load and not a clean disconnect
                if (!this.isPageLoading && event.code !== 1000) {
                    this.handleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received WebSocket message:', data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            this.isConnecting = false;
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            if (!this.isPageLoading) {
                this.handleReconnect();
            }
        }
    }

    setupPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        // Send ping every 25 seconds
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 25000);

        // Check for pong response every 30 seconds
        setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                const now = Date.now();
                if (now - this.lastPong > 30000) {
                    console.error('No pong received, closing connection');
                    this.ws.close();
                }
            }
        }, 30000);
    }

    handleReconnect() {
        if (this.pendingReconnect || this.isPageLoading) {
            return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.pendingReconnect = true;
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
                this.pendingReconnect = false;
                this.connect(this.token);
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
            this.disconnect();
        }
    }

    handleMessage(data) {
        if (!data || !data.type) {
            console.error('Invalid message format:', data);
            return;
        }

        // Update last pong time
        if (data.type === 'pong') {
            this.lastPong = Date.now();
            return;
        }

        const handler = this.handlers.get(data.type);
        if (handler) {
            handler(data);
        } else {
            console.warn('No handler found for message type:', data.type);
        }
    }

    on(type, handler) {
        if (!type || typeof handler !== 'function') {
            console.error('Invalid handler registration:', { type, handler });
            return;
        }
        this.handlers.set(type, handler);
    }

    off(type) {
        this.handlers.delete(type);
    }

    send(data) {
        if (!data || !data.type) {
            console.error('Invalid message format:', data);
            return;
        }

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    markAsViewed(notificationIds) {
        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            console.error('Invalid notification IDs:', notificationIds);
            return;
        }
        this.send({
            type: 'mark_viewed',
            notificationIds
        });
    }

    markAsOpened(notificationId) {
        if (!notificationId) {
            console.error('Invalid notification ID:', notificationId);
            return;
        }
        this.send({
            type: 'mark_opened',
            notificationId
        });
    }

    getPreferences() {
        this.send({
            type: 'get_preferences'
        });
    }

    updatePreferences(preferences) {
        if (!preferences || typeof preferences !== 'object') {
            console.error('Invalid preferences:', preferences);
            return;
        }
        this.send({
            type: 'update_preferences',
            preferences: {
                email_notifications: Boolean(preferences.email_notifications),
                push_notifications: Boolean(preferences.push_notifications)
            }
        });
    }

    getNotifications() {
        this.send({
            type: 'get_notifications'
        });
    }

    disconnect() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.handlers.clear();
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.token = null;
    }
}

export default new WebSocketService(); 
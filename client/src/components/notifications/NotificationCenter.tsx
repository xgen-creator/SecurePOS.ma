import React, { useEffect, useState } from 'react';
import { Badge, List, Drawer, Tag, Empty, Spin, Button } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
    timestamp: string;
    read: boolean;
    metadata?: any;
}

const NotificationCenter: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const { socket } = useSocket();
    const { user } = useAuth();

    useEffect(() => {
        if (socket && user) {
            loadNotifications();

            socket.on('notification:new', handleNewNotification);
            socket.on('notification:read', handleNotificationRead);
            socket.on('notification:deleted', handleNotificationDeleted);
            socket.on('notifications:allRead', handleAllNotificationsRead);

            return () => {
                socket.off('notification:new');
                socket.off('notification:read');
                socket.off('notification:deleted');
                socket.off('notifications:allRead');
            };
        }
    }, [socket, user]);

    const loadNotifications = async (pageNum = 1) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/notifications?page=${pageNum}`);
            const data = await response.json();
            
            if (pageNum === 1) {
                setNotifications(data.notifications);
            } else {
                setNotifications(prev => [...prev, ...data.notifications]);
            }
            
            setHasMore(data.pagination.page < data.pagination.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewNotification = (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
    };

    const handleNotificationRead = (notificationId: string) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId
                    ? { ...notif, read: true }
                    : notif
            )
        );
    };

    const handleNotificationDeleted = (notificationId: string) => {
        setNotifications(prev =>
            prev.filter(notif => notif.id !== notificationId)
        );
    };

    const handleAllNotificationsRead = () => {
        setNotifications(prev =>
            prev.map(notif => ({ ...notif, read: true }))
        );
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST'
            });
            socket?.emit('notifications:read', notificationId);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE'
            });
            handleNotificationDeleted(notificationId);
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications/read-all', {
                method: 'POST'
            });
            socket?.emit('notifications:readAll');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            loadNotifications(page + 1);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'success':
                return 'success';
            case 'warning':
                return 'warning';
            case 'error':
                return 'error';
            default:
                return 'default';
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <>
            <Badge count={unreadCount} offset={[-5, 5]}>
                <Button
                    type="text"
                    icon={<BellOutlined />}
                    onClick={() => setVisible(true)}
                    size="large"
                />
            </Badge>

            <Drawer
                title="Centre de Notifications"
                placement="right"
                onClose={() => setVisible(false)}
                visible={visible}
                width={400}
                extra={
                    <Button
                        type="text"
                        icon={<CheckOutlined />}
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        Tout marquer comme lu
                    </Button>
                }
            >
                {loading && notifications.length === 0 ? (
                    <div className="flex justify-center p-8">
                        <Spin />
                    </div>
                ) : notifications.length === 0 ? (
                    <Empty
                        description="Aucune notification"
                        className="my-8"
                    />
                ) : (
                    <List
                        dataSource={notifications}
                        renderItem={(notification) => (
                            <List.Item
                                className={`cursor-pointer transition-colors duration-200 ${
                                    !notification.read ? 'bg-blue-50' : ''
                                }`}
                                actions={[
                                    <Button
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        onClick={() => deleteNotification(notification.id)}
                                    />,
                                    !notification.read && (
                                        <Button
                                            type="text"
                                            icon={<CheckOutlined />}
                                            onClick={() => markAsRead(notification.id)}
                                        />
                                    )
                                ]}
                                onClick={() => !notification.read && markAsRead(notification.id)}
                            >
                                <List.Item.Meta
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span>{notification.title}</span>
                                            <Tag color={getSeverityColor(notification.severity)}>
                                                {notification.severity}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            <p>{notification.message}</p>
                                            <small className="text-gray-500">
                                                {formatDistanceToNow(new Date(notification.timestamp), {
                                                    addSuffix: true,
                                                    locale: fr
                                                })}
                                            </small>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                        loadMore={
                            hasMore && (
                                <div className="flex justify-center p-4">
                                    <Button
                                        onClick={loadMore}
                                        loading={loading}
                                    >
                                        Charger plus
                                    </Button>
                                </div>
                            )
                        }
                    />
                )}
            </Drawer>
        </>
    );
};

export default NotificationCenter;

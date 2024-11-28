import React, { useState, useEffect } from 'react';
import { Bell, X, Filter, Check } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Checkbox } from '../../ui/checkbox';
import NotificationService, { Notification } from '../../../services/automation/NotificationService';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(['all']));
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  useEffect(() => {
    const loadNotifications = () => {
      const allNotifications = NotificationService.getNotifications();
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length);
      
      // Extraire les sources uniques
      const sources = new Set(allNotifications.map(n => n.source));
      setAvailableSources(['all', ...Array.from(sources)]);
    };

    loadNotifications();

    // S'abonner aux événements de notification
    NotificationService.on('notificationAdded', loadNotifications);
    NotificationService.on('notificationRemoved', loadNotifications);
    NotificationService.on('notificationsCleared', loadNotifications);

    return () => {
      NotificationService.off('notificationAdded', loadNotifications);
      NotificationService.off('notificationRemoved', loadNotifications);
      NotificationService.off('notificationsCleared', loadNotifications);
    };
  }, []);

  const handleMarkAsRead = (notificationId: string) => {
    NotificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => prev - 1);
  };

  const handleRemoveNotification = (notificationId: string) => {
    NotificationService.removeNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (!notifications.find(n => n.id === notificationId)?.read) {
      setUnreadCount(prev => prev - 1);
    }
  };

  const handleClearAll = () => {
    NotificationService.clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev => {
      const newSources = new Set(prev);
      if (source === 'all') {
        if (newSources.has('all')) {
          newSources.clear();
        } else {
          newSources.clear();
          newSources.add('all');
        }
      } else {
        if (newSources.has('all')) {
          newSources.clear();
          availableSources
            .filter(s => s !== 'all' && s !== source)
            .forEach(s => newSources.add(s));
        } else {
          if (newSources.has(source)) {
            newSources.delete(source);
          } else {
            newSources.add(source);
          }
        }
      }
      return newSources;
    });
  };

  const filteredNotifications = notifications.filter(notification =>
    selectedSources.has('all') || selectedSources.has(notification.source)
  );

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <Bell className="w-4 h-4 text-yellow-500" />;
      case 'info':
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setIsOpen(true)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    {availableSources.map(source => (
                      <div
                        key={source}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`source-${source}`}
                          checked={selectedSources.has(source)}
                          onCheckedChange={() => handleSourceToggle(source)}
                        />
                        <label
                          htmlFor={`source-${source}`}
                          className="text-sm font-medium capitalize"
                        >
                          {source === 'all' ? 'Toutes les sources' : source}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={notifications.length === 0}
              >
                Tout effacer
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Aucune notification
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${getNotificationColor(
                    notification.type
                  )} ${!notification.read ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div>
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-gray-600">
                          {notification.message}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(notification.timestamp, {
                              addSuffix: true,
                              locale: fr
                            })}
                          </span>
                          <Badge variant="secondary" className="capitalize">
                            {notification.source}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveNotification(notification.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {notification.actions && (
                    <div className="mt-3 flex items-center gap-2">
                      {notification.actions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            action.onClick();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMarkEventAsViewed, useUpdateEvent, useDeleteEvent } from '@/hooks/useEvents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, EyeOff, MoreHorizontal, Edit, Trash2, AlertTriangle, Share2 } from 'lucide-react';
import { formatDateTime, getUserShortName } from '@/lib/utils';
import { telegramWebApp } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import type { Event, User } from '@shared/schema';

interface EventCardProps {
  event: Event & { createdBy: User };
  groupId: number;
  compact?: boolean;
}

export default function EventCard({ event, groupId, compact = false }: EventCardProps) {
  const { user, hasPermission } = useAuth();
  const [isViewed, setIsViewed] = useState(false); // This should come from viewed events data
  
  const markAsViewedMutation = useMarkEventAsViewed();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

  const canEdit = user && hasPermission(groupId, 'edit');
  const canDelete = user && hasPermission(groupId, 'delete');

  const handleMarkAsViewed = async () => {
    if (!user) return;
    
    try {
      await markAsViewedMutation.mutateAsync({
        eventId: event.id,
        userId: user.id,
        groupId,
      });
      setIsViewed(true);
      telegramWebApp.selectionFeedback();
    } catch (error) {
      console.error('Failed to mark event as viewed:', error);
    }
  };

  const handleEdit = () => {
    // TODO: Open edit modal
    telegramWebApp.impactFeedback('light');
  };

  const handleDelete = async () => {
    const confirmed = await telegramWebApp.showConfirm(
      'Вы действительно хотите удалить это событие?'
    );

    if (confirmed) {
      try {
        await deleteEventMutation.mutateAsync({ id: event.id, groupId });
        telegramWebApp.notificationFeedback('success');
      } catch (error) {
        telegramWebApp.notificationFeedback('error');
      }
    }
  };

  const handleShare = async () => {
    try {
      const text = `${event.title}\n\n${event.description || ''}\n\n📚 ${event.subject || 'Без предмета'}`;
      await telegramWebApp.showAlert('Функция поделиться будет доступна в следующих версиях');
    } catch (error) {
      console.error('Failed to share event:', error);
    }
  };

  return (
    <Card className={cn(
      "event-card transition-all hover:shadow-md",
      event.isImportant && "important",
      compact && "p-3"
    )}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {event.isImportant && (
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
            )}
            <Badge variant={event.isImportant ? "destructive" : "secondary"} className="text-xs">
              {event.isImportant ? 'ВАЖНОЕ' : 'ОБЫЧНОЕ'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {formatDateTime(event.createdAt)}
            </span>
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="w-4 h-4 mr-2" />
                      Редактировать
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Subject */}
        {event.subject && (
          <div className="mb-3">
            <Badge variant="outline" className="text-xs">
              {event.subject}
            </Badge>
          </div>
        )}

        {/* Content */}
        <div className="mb-3">
          <h4 className="font-semibold text-gray-900 mb-2">{event.title}</h4>
          {event.description && (
            <p className={cn(
              "text-gray-700 text-sm",
              compact && "line-clamp-2"
            )}>
              {event.description}
            </p>
          )}
        </div>

        {/* Media */}
        {event.mediaUrl && (
          <div className="mb-3">
            {event.mediaType === 'image' ? (
              <img
                src={event.mediaUrl}
                alt={event.title}
                className="w-full h-32 object-cover rounded-lg"
              />
            ) : event.mediaType === 'video' ? (
              <video
                src={event.mediaUrl}
                className="w-full h-32 object-cover rounded-lg"
                controls
              />
            ) : null}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAsViewed}
              disabled={isViewed || markAsViewedMutation.isPending}
              className={cn(
                "flex items-center space-x-1 text-sm",
                isViewed ? "text-telegram-blue" : "text-muted-foreground hover:text-telegram-blue"
              )}
            >
              {isViewed ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Просмотрено</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Отметить просмотренным</span>
                </>
              )}
            </Button>

            {!compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-telegram-blue"
              >
                <Share2 className="w-4 h-4" />
                <span>Поделиться</span>
              </Button>
            )}
          </div>

          {!compact && (
            <div className="flex items-center space-x-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {event.createdBy.firstName.charAt(0)}{event.createdBy.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {getUserShortName(event.createdBy)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

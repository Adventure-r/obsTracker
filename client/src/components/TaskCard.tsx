import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCompleteDeadline, useUpdateDeadline, useDeleteDeadline, useCreateReminder } from '@/hooks/useTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Clock, 
  CheckCircle, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Bell, 
  BellRing,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { formatDateTime, formatTimeRemaining, getUrgencyLevel, getUserShortName } from '@/lib/utils';
import { telegramWebApp } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import type { Deadline, User } from '@shared/schema';

interface TaskCardProps {
  task: Deadline & { createdBy: User };
  groupId: number;
  compact?: boolean;
}

export default function TaskCard({ task, groupId, compact = false }: TaskCardProps) {
  const { user, hasPermission } = useAuth();
  const [hasReminder, setHasReminder] = useState(false); // This should come from reminders data
  
  const completeTaskMutation = useCompleteDeadline();
  const updateTaskMutation = useUpdateDeadline();
  const deleteTaskMutation = useDeleteDeadline();
  const createReminderMutation = useCreateReminder();

  const canEdit = user && hasPermission(groupId, 'edit');
  const canDelete = user && hasPermission(groupId, 'delete');

  const urgencyLevel = task.isCompleted ? 'normal' : getUrgencyLevel(task.endDate);
  const timeRemaining = formatTimeRemaining(task.endDate);

  const handleComplete = async () => {
    try {
      await completeTaskMutation.mutateAsync({ id: task.id, groupId });
      telegramWebApp.notificationFeedback('success');
    } catch (error) {
      telegramWebApp.notificationFeedback('error');
    }
  };

  const handleEdit = () => {
    // TODO: Open edit modal
    telegramWebApp.impactFeedback('light');
  };

  const handleDelete = async () => {
    const confirmed = await telegramWebApp.showConfirm(
      'Вы действительно хотите удалить эту задачу?'
    );

    if (confirmed) {
      try {
        await deleteTaskMutation.mutateAsync({ id: task.id, groupId });
        telegramWebApp.notificationFeedback('success');
      } catch (error) {
        telegramWebApp.notificationFeedback('error');
      }
    }
  };

  const handleSetReminder = async () => {
    if (!user) return;

    try {
      // Set reminder for 1 day before deadline
      const reminderTime = new Date(task.endDate);
      reminderTime.setDate(reminderTime.getDate() - 1);
      
      await createReminderMutation.mutateAsync({
        userId: user.id,
        deadlineId: task.id,
        reminderTime,
        message: `Напоминание: ${task.title} - до сдачи остался 1 день`,
      });
      
      setHasReminder(true);
      telegramWebApp.notificationFeedback('success');
    } catch (error) {
      telegramWebApp.notificationFeedback('error');
    }
  };

  return (
    <Card className={cn(
      "task-card transition-all hover:shadow-md",
      urgencyLevel === 'urgent' && "urgent",
      urgencyLevel === 'warning' && "warning",
      task.isCompleted && "completed",
      compact && "p-3"
    )}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {task.isCompleted ? (
              <div className="w-2 h-2 bg-telegram-green rounded-full"></div>
            ) : (
              <div className={cn(
                "w-2 h-2 rounded-full",
                urgencyLevel === 'urgent' && "bg-destructive animate-pulse",
                urgencyLevel === 'warning' && "bg-orange-500",
                urgencyLevel === 'normal' && "bg-telegram-blue"
              )}></div>
            )}
            <Badge 
              variant={
                task.isCompleted ? "default" : 
                urgencyLevel === 'urgent' ? "destructive" : 
                urgencyLevel === 'warning' ? "secondary" : 
                "outline"
              } 
              className="text-xs"
            >
              {task.isCompleted ? 'ВЫПОЛНЕНО' : 
               urgencyLevel === 'urgent' ? 'СРОЧНО' : 
               urgencyLevel === 'warning' ? 'СКОРО' : 'ОБЫЧНОЕ'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
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
        {task.subject && (
          <div className="mb-3">
            <Badge variant="outline" className="text-xs">
              {task.subject}
            </Badge>
          </div>
        )}

        {/* Content */}
        <div className="mb-3">
          <h4 className={cn(
            "font-semibold text-gray-900 mb-2",
            task.isCompleted && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h4>
          {task.description && (
            <p className={cn(
              "text-gray-700 text-sm",
              compact && "line-clamp-2",
              task.isCompleted && "text-muted-foreground"
            )}>
              {task.description}
            </p>
          )}
        </div>

        {/* Media */}
        {task.mediaUrl && (
          <div className="mb-3">
            {task.mediaType === 'image' ? (
              <img
                src={task.mediaUrl}
                alt={task.title}
                className="w-full h-32 object-cover rounded-lg"
              />
            ) : task.mediaType === 'video' ? (
              <video
                src={task.mediaUrl}
                className="w-full h-32 object-cover rounded-lg"
                controls
              />
            ) : null}
          </div>
        )}

        {/* Deadline Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-sm">
            <Clock className={cn(
              "w-4 h-4",
              task.isCompleted ? "text-telegram-green" :
              urgencyLevel === 'urgent' ? "text-destructive" :
              urgencyLevel === 'warning' ? "text-orange-500" :
              "text-telegram-blue"
            )} />
            <span className={cn(
              "font-medium",
              task.isCompleted ? "text-telegram-green" :
              urgencyLevel === 'urgent' ? "text-destructive" :
              urgencyLevel === 'warning' ? "text-orange-500" :
              "text-telegram-blue"
            )}>
              {task.isCompleted ? 'Выполнено' : `До сдачи: ${timeRemaining}`}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDateTime(task.endDate)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!task.isCompleted && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSetReminder}
                  disabled={hasReminder || createReminderMutation.isPending}
                  className={cn(
                    "flex items-center space-x-1 text-sm",
                    hasReminder ? "text-telegram-green" : "text-muted-foreground hover:text-telegram-blue"
                  )}
                >
                  {hasReminder ? (
                    <>
                      <BellRing className="w-4 h-4" />
                      <span>Напоминание установлено</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Напомнить</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleComplete}
                  disabled={completeTaskMutation.isPending}
                  className="flex items-center space-x-1 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Выполнено</span>
                </Button>
              </>
            )}
          </div>

          {!compact && (
            <div className="flex items-center space-x-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {task.createdBy.firstName.charAt(0)}{task.createdBy.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {getUserShortName(task.createdBy)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

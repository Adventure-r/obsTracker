import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { telegramWebApp } from '@/lib/telegram';

interface DayEventsModalProps {
  date: Date;
  queues: any[];
  groupId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function DayEventsModal({ date, queues, groupId, isOpen, onClose }: DayEventsModalProps) {
  const { user, hasPermission } = useAuth();
  const [selectedTopics, setSelectedTopics] = useState<{ [queueId: number]: string }>({});

  const canParticipate = user && hasPermission(groupId, 'create'); // Participants can join queues

  // Fetch topics for each queue
  const topicsQueries = useQuery({
    queryKey: ['/api/queues', 'topics', queues.map(q => q.id)],
    queryFn: async () => {
      const results = await Promise.all(
        queues.map(async (queue) => {
          const response = await fetch(`/api/queues/${queue.id}/topics`, {
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Failed to fetch topics');
          const topics = await response.json();
          return { queueId: queue.id, topics };
        })
      );
      return results;
    },
    enabled: queues.length > 0,
  });

  // Fetch participants for each queue
  const participantsQueries = useQuery({
    queryKey: ['/api/queues', 'participants', queues.map(q => q.id)],
    queryFn: async () => {
      const results = await Promise.all(
        queues.map(async (queue) => {
          const response = await fetch(`/api/queues/${queue.id}/participants`, {
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Failed to fetch participants');
          const participants = await response.json();
          return { queueId: queue.id, participants };
        })
      );
      return results;
    },
    enabled: queues.length > 0,
  });

  const getQueueTopics = (queueId: number) => {
    const queueTopics = topicsQueries.data?.find(q => q.queueId === queueId);
    return queueTopics?.topics || [];
  };

  const getQueueParticipants = (queueId: number) => {
    const queueParticipants = participantsQueries.data?.find(q => q.queueId === queueId);
    return queueParticipants?.participants || [];
  };

  const handleTopicSelect = (queueId: number, topicValue: string) => {
    setSelectedTopics(prev => ({ ...prev, [queueId]: topicValue }));
  };

  const handleJoinQueue = async (queueId: number) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/queues/${queueId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) throw new Error('Failed to join queue');

      // If a topic was selected, update participant topic
      const selectedTopic = selectedTopics[queueId];
      if (selectedTopic) {
        await fetch(`/api/queues/${queueId}/participants/${user.id}/topic`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ topic: selectedTopic }),
        });
      }

      telegramWebApp.notificationFeedback('success');
      // Refetch data
      participantsQueries.refetch();
    } catch (error) {
      telegramWebApp.notificationFeedback('error');
    }
  };

  const getQueueTypeColor = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('лабораторная') || lowerTitle.includes('защита')) {
      return 'bg-telegram-blue text-white';
    }
    if (lowerTitle.includes('доклад') || lowerTitle.includes('презентация')) {
      return 'bg-telegram-orange text-white';
    }
    if (lowerTitle.includes('выбор') || lowerTitle.includes('тема')) {
      return 'bg-telegram-green text-white';
    }
    if (lowerTitle.includes('экзамен') || lowerTitle.includes('зачет')) {
      return 'bg-telegram-red text-white';
    }
    return 'bg-gray-500 text-white';
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ru });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(date, 'd MMMM, EEEE', { locale: ru })}
          </DialogTitle>
        </DialogHeader>

        {queues.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет событий</h3>
            <p className="text-muted-foreground">
              На этот день не запланировано событий
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {queues.map((queue) => {
              const topics = getQueueTopics(queue.id);
              const participants = getQueueParticipants(queue.id);
              const isUserParticipant = participants.some((p: any) => p.user.id === user?.id);
              const availableSlots = queue.maxParticipants - participants.length;

              return (
                <Card key={queue.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={getQueueTypeColor(queue.title)}>
                        {queue.subject || 'Без предмета'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(queue.date)}
                      </span>
                    </div>

                    <h4 className="font-semibold text-sm mb-2">{queue.title}</h4>
                    
                    {queue.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {queue.description}
                      </p>
                    )}

                    {/* Topic Selection */}
                    {topics.length > 0 && !isUserParticipant && (
                      <div className="mb-3">
                        <label className="block text-sm text-muted-foreground mb-2">
                          Выберите тему:
                        </label>
                        <Select
                          value={selectedTopics[queue.id] || ''}
                          onValueChange={(value) => handleTopicSelect(queue.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тему..." />
                          </SelectTrigger>
                          <SelectContent>
                            {topics.map((topic: any) => {
                              const topicParticipants = participants.filter(
                                (p: any) => p.selectedTopic === topic.title
                              );
                              const topicAvailable = topic.maxParticipants - topicParticipants.length;
                              
                              return (
                                <SelectItem 
                                  key={topic.id} 
                                  value={topic.title}
                                  disabled={topicAvailable <= 0}
                                >
                                  {topic.title} ({topicAvailable > 0 ? `доступно: ${topicAvailable}` : 'занято'})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Participants List */}
                    {participants.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm text-muted-foreground mb-2">
                          Участники ({participants.length}/{queue.maxParticipants}):
                        </div>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {participants.map((participant: any, index: number) => (
                            <div key={participant.id} className="flex items-center justify-between text-xs">
                              <span>
                                {index + 1}. {participant.user.firstName} {participant.user.lastName.charAt(0)}.
                              </span>
                              {participant.selectedTopic && (
                                <Badge variant="outline" className="text-xs">
                                  {participant.selectedTopic}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Свободно мест: {availableSlots}
                        </span>
                      </div>

                      {canParticipate && !isUserParticipant && availableSlots > 0 && (
                        <Button
                          size="sm"
                          className="telegram-button"
                          onClick={() => handleJoinQueue(queue.id)}
                        >
                          Записаться
                        </Button>
                      )}

                      {isUserParticipant && (
                        <div className="flex items-center space-x-1 text-telegram-green">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Вы записаны</span>
                        </div>
                      )}

                      {availableSlots <= 0 && !isUserParticipant && (
                        <Badge variant="secondary" className="text-xs">
                          Мест нет
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

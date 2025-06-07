import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGroupEvents } from '@/hooks/useEvents';
import { useGroupDeadlines } from '@/hooks/useTasks';
import { useGroupStats } from '@/hooks/useGroups';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import EventCard from '@/components/EventCard';
import TaskCard from '@/components/TaskCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { formatTimeRemaining, getUrgencyLevel } from '@/lib/utils';

export default function DashboardPage() {
  const { user, groups } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || 0);
  
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const { data: events = [] } = useGroupEvents(selectedGroupId);
  const { data: deadlines = [] } = useGroupDeadlines(selectedGroupId);
  const { data: stats } = useGroupStats(selectedGroupId);

  // Filter important events and urgent deadlines
  const importantEvents = events.filter(event => event.isImportant).slice(0, 3);
  const urgentDeadlines = deadlines
    .filter(deadline => !deadline.isCompleted && getUrgencyLevel(deadline.endDate) !== 'normal')
    .slice(0, 3);

  if (!selectedGroup) {
    return (
      <div className="min-h-screen bg-telegram-section-bg">
        <Header />
        <div className="p-4 text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Нет доступных групп</h2>
          <p className="text-muted-foreground">Создайте группу или присоединитесь к существующей</p>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-section-bg">
      <Header />
      
      <main className="pb-20">
        {/* Group Selector */}
        {groups.length > 1 && (
          <div className="p-4 bg-telegram-bg border-b border-gray-100">
            <div className="flex gap-2 overflow-x-auto">
              {groups.map((group) => (
                <Button
                  key={group.id}
                  variant={selectedGroupId === group.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedGroupId(group.id)}
                  className="whitespace-nowrap"
                >
                  {group.name}
                  <Badge variant="secondary" className="ml-2">
                    {group.role === 'leader' ? 'Староста' : group.role === 'assistant' ? 'Помощник' : 'Участник'}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-telegram-blue mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats?.memberCount || 0}</div>
                <div className="text-sm text-muted-foreground">Участников</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 text-telegram-green mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats?.eventCount || 0}</div>
                <div className="text-sm text-muted-foreground">События</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-telegram-orange mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats?.activeDeadlineCount || 0}</div>
                <div className="text-sm text-muted-foreground">Активные задачи</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-telegram-red mx-auto mb-2" />
                <div className="text-2xl font-bold">{urgentDeadlines.length}</div>
                <div className="text-sm text-muted-foreground">Срочные</div>
              </CardContent>
            </Card>
          </div>

          {/* Important Events */}
          {importantEvents.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Важные события</h2>
                <Button variant="ghost" size="sm">
                  Все события
                </Button>
              </div>
              <div className="space-y-3">
                {importantEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    groupId={selectedGroupId}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          {/* Urgent Deadlines */}
          {urgentDeadlines.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Срочные задачи</h2>
                <Button variant="ghost" size="sm">
                  Все задачи
                </Button>
              </div>
              <div className="space-y-3">
                {urgentDeadlines.map((deadline) => (
                  <TaskCard
                    key={deadline.id}
                    task={deadline}
                    groupId={selectedGroupId}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Быстрые действия</CardTitle>
              <CardDescription>
                Часто используемые функции
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(selectedGroup.role === 'leader' || selectedGroup.role === 'assistant') && (
                <>
                  <Button className="w-full telegram-button justify-start" size="lg">
                    <Calendar className="w-5 h-5 mr-3" />
                    Создать событие
                  </Button>
                  <Button className="w-full telegram-button justify-start" size="lg">
                    <Clock className="w-5 h-5 mr-3" />
                    Добавить задачу
                  </Button>
                  <Separator />
                </>
              )}
              
              <Button variant="outline" className="w-full justify-start" size="lg">
                <Users className="w-5 h-5 mr-3" />
                Участники группы
              </Button>
              
              <Button variant="outline" className="w-full justify-start" size="lg">
                <TrendingUp className="w-5 h-5 mr-3" />
                Статистика
              </Button>
            </CardContent>
          </Card>

          {/* Empty States */}
          {events.length === 0 && deadlines.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Добро пожаловать в {selectedGroup.name}!</h3>
                <p className="text-muted-foreground mb-4">
                  Пока здесь нет событий и задач. 
                  {(selectedGroup.role === 'leader' || selectedGroup.role === 'assistant') 
                    ? ' Создайте первое событие или задачу.' 
                    : ' Дождитесь, пока староста добавит первые материалы.'}
                </p>
                {(selectedGroup.role === 'leader' || selectedGroup.role === 'assistant') && (
                  <div className="flex gap-2 justify-center">
                    <Button className="telegram-button">
                      Создать событие
                    </Button>
                    <Button variant="outline">
                      Добавить задачу
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Navigation />
    </div>
  );
}

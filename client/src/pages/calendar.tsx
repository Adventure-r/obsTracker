import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import CalendarView from '@/components/CalendarView';
import DayEventsModal from '@/components/Modals/DayEventsModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function CalendarPage() {
  const { groups, hasPermission } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || 0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Fetch queues for the current month
  const { data: monthlyQueues = [] } = useQuery({
    queryKey: ['/api/groups', selectedGroupId, 'queues', 'month', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const promises = [];
      
      // Fetch queues for each day of the month
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        promises.push(
          fetch(`/api/groups/${selectedGroupId}/queues/date/${format(day, 'yyyy-MM-dd')}`, {
            credentials: 'include',
          }).then(res => res.json()).then(queues => ({ date: day, queues }))
        );
      }
      
      const results = await Promise.all(promises);
      return results.filter(result => result.queues.length > 0);
    },
    enabled: !!selectedGroupId,
  });

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const canCreateBookings = selectedGroup && hasPermission(selectedGroupId, 'create');

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowDayModal(true);
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const getDateQueues = (date: Date) => {
    const dayData = monthlyQueues.find(item => 
      isSameDay(item.date, date)
    );
    return dayData?.queues || [];
  };

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
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Header */}
        <div className="p-4 bg-telegram-bg border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Календарь бронирования</h1>
            {canCreateBookings && (
              <Button
                className="telegram-button"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            )}
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <h2 className="text-lg font-semibold">
              {format(currentDate, 'LLLL yyyy', { locale: ru })}
            </h2>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar */}
        <div className="p-4">
          <CalendarView
            currentDate={currentDate}
            onDateClick={handleDateClick}
            getDateQueues={getDateQueues}
          />
        </div>

        {/* Legend */}
        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Легенда</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-telegram-blue rounded-full"></div>
                <span className="text-sm">Защита лабораторных</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-telegram-orange rounded-full"></div>
                <span className="text-sm">Доклады и презентации</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-telegram-green rounded-full"></div>
                <span className="text-sm">Выбор тем</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-telegram-red rounded-full"></div>
                <span className="text-sm">Экзамены и зачеты</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статистика месяца</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-telegram-blue">
                    {monthlyQueues.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Дней с событиями</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-telegram-green">
                    {monthlyQueues.reduce((total, item) => total + item.queues.length, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Всего событий</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {monthlyQueues.length === 0 && (
          <div className="p-4">
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет событий в этом месяце</h3>
                <p className="text-muted-foreground mb-4">
                  {canCreateBookings
                    ? 'Создайте первое событие для бронирования времени'
                    : 'События появятся здесь когда они будут созданы старостой'}
                </p>
                {canCreateBookings && (
                  <Button className="telegram-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать событие
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Navigation />

      {showDayModal && selectedDate && (
        <DayEventsModal
          date={selectedDate}
          queues={getDateQueues(selectedDate)}
          groupId={selectedGroupId}
          isOpen={showDayModal}
          onClose={() => setShowDayModal(false)}
        />
      )}
    </div>
  );
}

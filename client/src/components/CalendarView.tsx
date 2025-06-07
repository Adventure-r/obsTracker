import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ru } from 'date-fns/locale';

interface CalendarViewProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  getDateQueues: (date: Date) => any[];
}

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CalendarView({ currentDate, onDateClick, getDateQueues }: CalendarViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getQueueTypeColor = (queueType: string) => {
    switch (queueType.toLowerCase()) {
      case 'лабораторная':
      case 'защита':
        return 'bg-telegram-blue';
      case 'доклад':
      case 'презентация':
        return 'bg-telegram-orange';
      case 'выбор':
      case 'тема':
        return 'bg-telegram-green';
      case 'экзамен':
      case 'зачет':
        return 'bg-telegram-red';
      default:
        return 'bg-telegram-blue';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {weekDays.map((day) => (
          <div key={day} className="p-3 text-center text-xs font-semibold text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dayQueues = getDateQueues(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);
          const hasEvents = dayQueues.length > 0;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "calendar-day border-r border-b border-gray-100 last:border-r-0",
                !isCurrentMonth && "text-gray-400 bg-gray-50",
                hasEvents && isCurrentMonth && "has-events",
                isDayToday && "bg-telegram-blue/10 border-telegram-blue/30"
              )}
              onClick={() => isCurrentMonth && onDateClick(day)}
            >
              <div className="p-2 min-h-[80px] flex flex-col">
                <div className={cn(
                  "text-sm font-medium mb-1",
                  isDayToday && "font-bold text-telegram-blue"
                )}>
                  {format(day, 'd')}
                </div>
                
                {hasEvents && isCurrentMonth && (
                  <div className="flex-1 flex flex-col space-y-1">
                    {dayQueues.slice(0, 2).map((queue, index) => (
                      <div
                        key={queue.id}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          getQueueTypeColor(queue.title)
                        )}
                      />
                    ))}
                    
                    {dayQueues.length > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center"
                      >
                        {dayQueues.length}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

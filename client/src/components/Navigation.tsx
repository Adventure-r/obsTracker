import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Home, Calendar, CheckSquare, User, Plus } from 'lucide-react';
import { telegramWebApp } from '@/lib/telegram';

const navigationItems = [
  {
    path: '/',
    label: 'Главная',
    icon: Home,
  },
  {
    path: '/events',
    label: 'События',
    icon: Calendar,
  },
  {
    path: '/calendar',
    label: 'Бронь',
    icon: Calendar,
  },
  {
    path: '/tasks',
    label: 'Задачи',
    icon: CheckSquare,
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: User,
  },
];

export default function Navigation() {
  const [location, setLocation] = useLocation();

  const handleNavigation = (path: string) => {
    telegramWebApp.selectionFeedback();
    setLocation(path);
  };

  return (
    <nav className="bg-telegram-bg border-t border-gray-100 fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around px-2 py-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || 
              (item.path === '/' && (location === '/dashboard' || location === '/'));
            
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                className={cn(
                  "navigation-tab flex flex-col items-center space-y-1 p-2 min-w-0",
                  isActive ? "active" : ""
                )}
                onClick={() => handleNavigation(item.path === '/' ? '/dashboard' : item.path)}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium truncate">{item.label}</span>
                {/* Notification dots can be added here */}
                {(item.path === '/tasks' || item.path === '/events') && (
                  <div className="notification-dot opacity-0" />
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

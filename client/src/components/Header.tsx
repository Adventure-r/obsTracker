import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, GraduationCap } from 'lucide-react';
import { getUserDisplayName, getRoleDisplayName } from '@/lib/utils';

export default function Header() {
  const { user, groups } = useAuth();

  if (!user) {
    return (
      <header className="bg-telegram-bg sticky top-0 z-50 border-b border-gray-100">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-telegram-blue rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Lifeline</h1>
              <p className="text-xs text-muted-foreground">Студенческий помощник</p>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const currentGroup = groups[0]; // For simplicity, show first group in header
  const displayName = getUserDisplayName(user);
  const shortName = displayName.length > 20 ? `${user.firstName} ${user.lastName.charAt(0)}.` : displayName;

  return (
    <header className="bg-telegram-bg sticky top-0 z-50 border-b border-gray-100">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-telegram-blue text-white text-sm">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-sm text-gray-900">{shortName}</h2>
            <div className="flex items-center space-x-2">
              {currentGroup && (
                <>
                  <Badge className={`role-badge ${currentGroup.role} text-xs`}>
                    {getRoleDisplayName(currentGroup.role)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{currentGroup.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="p-2">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}

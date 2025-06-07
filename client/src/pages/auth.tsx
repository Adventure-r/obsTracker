import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { telegramWebApp } from '@/lib/telegram';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GraduationCap, Users, UserPlus } from 'lucide-react';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, groups, createGroup, joinGroup, isCreatingGroup, isJoiningGroup } = useAuth();
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  // Check for invite token in URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/invite/')) {
      const token = path.split('/invite/')[1];
      if (token) {
        setInviteToken(token);
        setShowJoinGroup(true);
      }
    }
  }, []);

  // Redirect if already authenticated and has groups
  useEffect(() => {
    if (isAuthenticated && groups.length > 0) {
      setLocation('/dashboard');
    } else if (isAuthenticated && groups.length === 0) {
      setShowGroupOptions(true);
    }
  }, [isAuthenticated, groups, setLocation]);

  const handleTelegramAuth = async () => {
    const user = telegramWebApp.getUser();
    if (!user) {
      await telegramWebApp.showAlert('Это приложение должно быть открыто в Telegram');
      return;
    }
    
    // Auth happens automatically via useAuth hook
    telegramWebApp.impactFeedback('light');
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      await telegramWebApp.showAlert('Введите название группы');
      return;
    }

    createGroup({
      name: groupName.trim(),
      description: groupDescription.trim() || undefined,
    });
  };

  const handleJoinGroup = async () => {
    if (!inviteToken.trim()) {
      await telegramWebApp.showAlert('Введите токен приглашения');
      return;
    }

    joinGroup(inviteToken.trim());
  };

  if (showJoinGroup) {
    return (
      <div className="min-h-screen bg-telegram-bg p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-telegram-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Присоединиться к группе</CardTitle>
            <CardDescription>
              Введите токен приглашения для вступления в группу
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-token">Токен приглашения</Label>
              <Input
                id="invite-token"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="Введите токен..."
              />
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowJoinGroup(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 telegram-button"
                onClick={handleJoinGroup}
                disabled={isJoiningGroup || !inviteToken.trim()}
              >
                {isJoiningGroup ? 'Присоединение...' : 'Присоединиться'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showCreateGroup) {
    return (
      <div className="min-h-screen bg-telegram-bg p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-telegram-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Создать группу</CardTitle>
            <CardDescription>
              Станьте старостой новой группы
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Название группы *</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="КФУ-22, ИВТ-01-22..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Описание (опционально)</Label>
              <Input
                id="group-description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Краткое описание группы..."
              />
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateGroup(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 telegram-button"
                onClick={handleCreateGroup}
                disabled={isCreatingGroup || !groupName.trim()}
              >
                {isCreatingGroup ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showGroupOptions) {
    return (
      <div className="min-h-screen bg-telegram-bg p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-telegram-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Добро пожаловать!</CardTitle>
            <CardDescription>
              Выберите действие для продолжения
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full telegram-button flex items-center space-x-3"
              onClick={() => setShowCreateGroup(true)}
            >
              <Users className="w-5 h-5" />
              <span>Создать группу</span>
            </Button>
            
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-muted-foreground">
                или
              </span>
            </div>
            
            <Button
              variant="outline"
              className="w-full flex items-center space-x-3"
              onClick={() => setShowJoinGroup(true)}
            >
              <UserPlus className="w-5 h-5" />
              <span>Присоединиться к группе</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-telegram-blue rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl">Lifeline</CardTitle>
          <CardDescription className="text-lg">
            Студенческий помощник КФУ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full telegram-button text-lg py-6 flex items-center justify-center space-x-3"
            onClick={handleTelegramAuth}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span>Войти через Telegram</span>
          </Button>
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            Безопасная авторизация через ваш аккаунт Telegram
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

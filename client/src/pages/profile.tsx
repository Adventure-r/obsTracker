import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGroupMembers, useCreateInvitation } from '@/hooks/useGroups';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Users, 
  Settings, 
  Link as LinkIcon, 
  Bell, 
  Info, 
  LogOut, 
  Crown, 
  UserPlus,
  Copy,
  Check
} from 'lucide-react';
import { getUserDisplayName, getUserShortName, getRoleDisplayName, generateInviteLink, copyToClipboard } from '@/lib/utils';
import { telegramWebApp } from '@/lib/telegram';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, groups, hasPermission, leaveGroup } = useAuth();
  const { toast } = useToast();
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || 0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const { data: members = [] } = useGroupMembers(selectedGroupId);
  const createInvitationMutation = useCreateInvitation(selectedGroupId);

  const canInvite = selectedGroup && hasPermission(selectedGroupId, 'invite');
  const canManageGroup = selectedGroup && selectedGroup.role === 'leader';

  const handleCreateInvitation = async () => {
    if (!user) return;

    try {
      const invitation = await createInvitationMutation.mutateAsync(user.id);
      const inviteLink = generateInviteLink(invitation.inviteToken);
      
      await copyToClipboard(inviteLink);
      setCopiedToken(invitation.inviteToken);
      
      toast({
        title: "Приглашение создано",
        description: "Ссылка скопирована в буфер обмена",
      });

      setTimeout(() => setCopiedToken(null), 3000);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать приглашение",
        variant: "destructive",
      });
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;

    const confirmed = await telegramWebApp.showConfirm(
      `Вы действительно хотите покинуть группу "${selectedGroup.name}"?`
    );

    if (confirmed) {
      leaveGroup(selectedGroup.id);
      setShowLeaveConfirm(false);
    }
  };

  if (!user || !selectedGroup) {
    return (
      <div className="min-h-screen bg-telegram-section-bg">
        <Header />
        <div className="p-4 text-center">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Профиль недоступен</h2>
          <p className="text-muted-foreground">Данные пользователя не найдены</p>
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
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* User Profile */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-telegram-blue text-white text-lg">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{getUserDisplayName(user)}</h3>
                  {user.telegramUsername && (
                    <p className="text-muted-foreground">@{user.telegramUsername}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={`role-badge ${selectedGroup.role}`}>
                      {getRoleDisplayName(selectedGroup.role)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">ID: {user.id}</span>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Группа:</span>
                  <span className="font-medium">{selectedGroup.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Участников:</span>
                  <span className="font-medium">{members.length}</span>
                </div>
                {selectedGroup.description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Описание:</span>
                    <span className="font-medium text-right flex-1 ml-4">{selectedGroup.description}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Group Management */}
          {canManageGroup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-telegram-orange" />
                  Управление группой
                </CardTitle>
                <CardDescription>
                  Функции доступные старосте группы
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowMembersModal(true)}
                >
                  <Users className="w-4 h-4 mr-3" />
                  Участники группы ({members.length})
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="w-4 h-4 mr-3" />
                  Пригласить участника
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Редактировать группу
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {canInvite && !canManageGroup && (
            <Card>
              <CardHeader>
                <CardTitle>Быстрые действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="w-4 h-4 mr-3" />
                  Пригласить участника
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Настройки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="w-4 h-4 mr-3" />
                Уведомления
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Info className="w-4 h-4 mr-3" />
                О приложении
              </Button>
              
              <Separator />
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setShowLeaveConfirm(true)}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Покинуть группу
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Navigation />

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пригласить участника</DialogTitle>
            <DialogDescription>
              Создайте ссылку-приглашение для нового участника
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ссылка будет действительна в течение 7 дней. После перехода по ссылке 
              участник автоматически присоединится к группе.
            </p>
            
            <Button
              className="w-full telegram-button"
              onClick={handleCreateInvitation}
              disabled={createInvitationMutation.isPending}
            >
              {createInvitationMutation.isPending ? (
                <>Создание...</>
              ) : copiedToken ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Ссылка скопирована
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Создать приглашение
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Members Modal */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Участники группы</DialogTitle>
            <DialogDescription>
              {members.length} участников в группе "{selectedGroup.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted">
                <Avatar>
                  <AvatarFallback>
                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{getUserShortName(member)}</p>
                  {member.telegramUsername && (
                    <p className="text-xs text-muted-foreground">@{member.telegramUsername}</p>
                  )}
                </div>
                <Badge className={`role-badge ${member.isLeader ? 'leader' : member.isAssistant ? 'assistant' : 'member'}`}>
                  {member.isLeader ? 'Староста' : member.isAssistant ? 'Помощник' : 'Участник'}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation Modal */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Покинуть группу</DialogTitle>
            <DialogDescription>
              Вы действительно хотите покинуть группу "{selectedGroup.name}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              После выхода из группы вы потеряете доступ ко всем событиям, задачам и материалам. 
              Для повторного вступления потребуется новое приглашение.
            </p>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleLeaveGroup}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Покинуть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { telegramWebApp } from '@/lib/telegram';
import type { User, Group } from '@shared/schema';

interface AuthState {
  user: User | null;
  groups: Array<Group & { role: 'leader' | 'assistant' | 'member' }>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    groups: [],
    isAuthenticated: false,
    isLoading: true,
  });

  // Check authentication status
  const { data: authData, isLoading, error } = useQuery({
    queryKey: ['/api/auth/check'],
    queryFn: async () => {
      const telegramUser = telegramWebApp.getUser();
      
      if (!telegramUser) {
        throw new Error('No Telegram user data available');
      }

      const response = await apiRequest('POST', '/api/auth/telegram', {
        telegram_id: telegramUser.id.toString(),
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
      });

      return await response.json();
    },
    retry: false,
  });

  // Update auth state when data changes
  useEffect(() => {
    if (authData) {
      setAuthState({
        user: authData.user,
        groups: authData.groups || [],
        isAuthenticated: true,
        isLoading: false,
      });
    } else if (!isLoading) {
      setAuthState({
        user: null,
        groups: [],
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, [authData, isLoading]);

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; description?: string }) => {
      if (!authState.user) {
        throw new Error('User not authenticated');
      }

      const response = await apiRequest('POST', '/api/groups', {
        ...groupData,
        userId: authState.user.id,
      });

      return await response.json();
    },
    onSuccess: (newGroup) => {
      // Update groups in auth state
      setAuthState(prev => ({
        ...prev,
        groups: [...prev.groups, { ...newGroup, role: 'leader' as const }],
      }));
      
      // Invalidate auth query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });

  // Join group via invitation
  const joinGroupMutation = useMutation({
    mutationFn: async (inviteToken: string) => {
      if (!authState.user) {
        throw new Error('User not authenticated');
      }

      const response = await apiRequest('POST', `/api/invitations/${inviteToken}/use`, {
        userId: authState.user.id,
      });

      return await response.json();
    },
    onSuccess: (data) => {
      // Update groups in auth state
      setAuthState(prev => ({
        ...prev,
        groups: [...prev.groups, { ...data.group, role: 'member' as const }],
      }));
      
      // Invalidate auth query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      if (!authState.user) {
        throw new Error('User not authenticated');
      }

      const response = await apiRequest('POST', `/api/groups/${groupId}/leave`, {
        userId: authState.user.id,
      });

      return await response.json();
    },
    onSuccess: (_, groupId) => {
      // Remove group from auth state
      setAuthState(prev => ({
        ...prev,
        groups: prev.groups.filter(g => g.id !== groupId),
      }));
      
      queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });

  // Get current user's role in a specific group
  const getUserRole = (groupId: number): 'leader' | 'assistant' | 'member' | null => {
    const group = authState.groups.find(g => g.id === groupId);
    return group?.role || null;
  };

  // Check if user has permission for an action
  const hasPermission = (groupId: number, action: 'create' | 'edit' | 'delete' | 'invite'): boolean => {
    const role = getUserRole(groupId);
    
    switch (action) {
      case 'create':
      case 'edit':
        return role === 'leader' || role === 'assistant';
      case 'delete':
      case 'invite':
        return role === 'leader';
      default:
        return false;
    }
  };

  return {
    ...authState,
    isLoading: isLoading || authState.isLoading,
    error,
    createGroup: createGroupMutation.mutate,
    joinGroup: joinGroupMutation.mutate,
    leaveGroup: leaveGroupMutation.mutate,
    getUserRole,
    hasPermission,
    isCreatingGroup: createGroupMutation.isPending,
    isJoiningGroup: joinGroupMutation.isPending,
    isLeavingGroup: leaveGroupMutation.isPending,
  };
}

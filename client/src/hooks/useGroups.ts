import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { telegramWebApp } from '@/lib/telegram';
import type { User, GroupInvitation } from '@shared/schema';

export function useGroupMembers(groupId: number) {
  return useQuery({
    queryKey: ['/api/groups', groupId, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch group members');
      }
      return await response.json();
    },
    enabled: !!groupId,
  });
}

export function useCreateInvitation(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('POST', `/api/groups/${groupId}/invitations`, {
        userId,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', groupId, 'invitations'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useGroupInvitations(groupId: number) {
  return useQuery({
    queryKey: ['/api/groups', groupId, 'invitations'],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/invitations`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      return await response.json();
    },
    enabled: !!groupId,
  });
}

export function useUpdateMemberRole(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      isLeader, 
      isAssistant 
    }: { 
      userId: number; 
      isLeader: boolean; 
      isAssistant: boolean; 
    }) => {
      const response = await apiRequest('PATCH', `/api/groups/${groupId}/members/${userId}`, {
        isLeader,
        isAssistant,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', groupId, 'members'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useRemoveMember(groupId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('DELETE', `/api/groups/${groupId}/members/${userId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', groupId, 'members'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useGroupStats(groupId: number) {
  return useQuery({
    queryKey: ['/api/groups', groupId, 'stats'],
    queryFn: async () => {
      const [membersRes, eventsRes, deadlinesRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/members`, { credentials: 'include' }),
        fetch(`/api/groups/${groupId}/events`, { credentials: 'include' }),
        fetch(`/api/groups/${groupId}/deadlines`, { credentials: 'include' }),
      ]);

      const [members, events, deadlines] = await Promise.all([
        membersRes.json(),
        eventsRes.json(),
        deadlinesRes.json(),
      ]);

      return {
        memberCount: members.length,
        eventCount: events.length,
        activeDeadlineCount: deadlines.filter((d: any) => !d.isCompleted && new Date(d.endDate) > new Date()).length,
      };
    },
    enabled: !!groupId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

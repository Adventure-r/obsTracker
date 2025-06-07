import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { telegramWebApp } from '@/lib/telegram';
import type { Deadline, InsertDeadline, Reminder } from '@shared/schema';

export function useGroupDeadlines(groupId: number) {
  return useQuery({
    queryKey: ['/api/groups', groupId, 'deadlines'],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/deadlines`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch deadlines');
      }
      return await response.json();
    },
    enabled: !!groupId,
  });
}

export function useUserUpcomingDeadlines(userId: number) {
  return useQuery({
    queryKey: ['/api/users', userId, 'upcoming-deadlines'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/upcoming-deadlines`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch upcoming deadlines');
      }
      return await response.json();
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute to keep deadlines current
  });
}

export function useCreateDeadline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deadlineData: InsertDeadline) => {
      const response = await apiRequest('POST', '/api/deadlines', deadlineData);
      return await response.json();
    },
    onSuccess: (deadline) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', deadline.groupId, 'deadlines'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/users', 'upcoming-deadlines'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useUpdateDeadline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: number; 
      updates: Partial<InsertDeadline> 
    }) => {
      const response = await apiRequest('PATCH', `/api/deadlines/${id}`, updates);
      return await response.json();
    },
    onSuccess: (deadline) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', deadline.groupId, 'deadlines'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/users', 'upcoming-deadlines'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useDeleteDeadline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, groupId }: { id: number; groupId: number }) => {
      const response = await apiRequest('DELETE', `/api/deadlines/${id}`);
      return { response: await response.json(), groupId };
    },
    onSuccess: ({ groupId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', groupId, 'deadlines'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/users', 'upcoming-deadlines'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useCompleteDeadline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, groupId }: { id: number; groupId: number }) => {
      const response = await apiRequest('PATCH', `/api/deadlines/${id}`, {
        isCompleted: true,
      });
      return { response: await response.json(), groupId };
    },
    onSuccess: ({ groupId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', groupId, 'deadlines'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/users', 'upcoming-deadlines'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      deadlineId,
      reminderTime,
      message,
    }: {
      userId: number;
      deadlineId: number;
      reminderTime: Date;
      message: string;
    }) => {
      const response = await apiRequest('POST', '/api/reminders', {
        userId,
        deadlineId,
        reminderTime: reminderTime.toISOString(),
        message,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/users', 'reminders'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useUserReminders(userId: number) {
  return useQuery({
    queryKey: ['/api/users', userId, 'reminders'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/reminders`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reminders');
      }
      return await response.json();
    },
    enabled: !!userId,
  });
}

export function useTaskFilters(deadlines: any[], filters: {
  showCompleted?: boolean;
  urgencyLevel?: 'urgent' | 'warning' | 'normal';
  subject?: string;
}) {
  const now = new Date();

  return {
    filteredTasks: deadlines.filter(deadline => {
      if (!filters.showCompleted && deadline.isCompleted) {
        return false;
      }

      if (filters.urgencyLevel) {
        const hoursRemaining = (new Date(deadline.endDate).getTime() - now.getTime()) / (1000 * 60 * 60);
        
        switch (filters.urgencyLevel) {
          case 'urgent':
            if (hoursRemaining > 24) return false;
            break;
          case 'warning':
            if (hoursRemaining <= 24 || hoursRemaining > 72) return false;
            break;
          case 'normal':
            if (hoursRemaining <= 72) return false;
            break;
        }
      }

      if (filters.subject && deadline.subject !== filters.subject) {
        return false;
      }

      return true;
    }),
  };
}

export function useTaskSubjects(groupId: number) {
  const { data: deadlines = [] } = useGroupDeadlines(groupId);
  
  const subjects = [...new Set(
    deadlines
      .map((deadline: Deadline) => deadline.subject)
      .filter(Boolean)
  )].sort();

  return { subjects };
}

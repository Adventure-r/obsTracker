import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { telegramWebApp } from '@/lib/telegram';
import type { Event, InsertEvent } from '@shared/schema';

export function useGroupEvents(groupId: number) {
  return useQuery({
    queryKey: ['/api/groups', groupId, 'events'],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/events`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return await response.json();
    },
    enabled: !!groupId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: InsertEvent) => {
      const response = await apiRequest('POST', '/api/events', eventData);
      return await response.json();
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', event.groupId, 'events'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: number; 
      updates: Partial<InsertEvent> 
    }) => {
      const response = await apiRequest('PATCH', `/api/events/${id}`, updates);
      return await response.json();
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', event.groupId, 'events'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, groupId }: { id: number; groupId: number }) => {
      const response = await apiRequest('DELETE', `/api/events/${id}`);
      return { response: await response.json(), groupId };
    },
    onSuccess: ({ groupId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', groupId, 'events'] 
      });
      telegramWebApp.notificationFeedback('success');
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useMarkEventAsViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      userId,
      groupId 
    }: { 
      eventId: number; 
      userId: number;
      groupId: number;
    }) => {
      const response = await apiRequest('POST', `/api/events/${eventId}/view`, {
        userId,
      });
      return { response: await response.json(), groupId };
    },
    onSuccess: ({ groupId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/groups', groupId, 'events'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/users', 'viewed-events'] 
      });
      telegramWebApp.selectionFeedback();
    },
    onError: () => {
      telegramWebApp.notificationFeedback('error');
    },
  });
}

export function useUserViewedEvents(userId: number, groupId: number) {
  return useQuery({
    queryKey: ['/api/users', userId, 'viewed-events', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/viewed-events/${groupId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch viewed events');
      }
      return await response.json();
    },
    enabled: !!userId && !!groupId,
  });
}

export function useEventFilters(events: any[], filters: {
  showOnlyImportant?: boolean;
  showOnlyViewed?: boolean;
  subject?: string;
}) {
  return {
    filteredEvents: events.filter(event => {
      if (filters.showOnlyImportant && !event.isImportant) {
        return false;
      }
      
      if (filters.showOnlyViewed && !event.isViewed) {
        return false;
      }
      
      if (filters.subject && event.subject !== filters.subject) {
        return false;
      }
      
      return true;
    }),
  };
}

export function useEventSubjects(groupId: number) {
  const { data: events = [] } = useGroupEvents(groupId);
  
  const subjects = [...new Set(
    events
      .map((event: Event) => event.subject)
      .filter(Boolean)
  )].sort();

  return { subjects };
}

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGroupEvents, useEventSubjects, useEventFilters } from '@/hooks/useEvents';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import EventCard from '@/components/EventCard';
import CreateEventModal from '@/components/Modals/CreateEventModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Calendar } from 'lucide-react';

export default function EventsPage() {
  const { user, groups, hasPermission } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || 0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'important' | 'viewed'>('all');

  const { data: events = [], isLoading } = useGroupEvents(selectedGroupId);
  const { subjects } = useEventSubjects(selectedGroupId);

  // Filter events based on search and filters
  const { filteredEvents } = useEventFilters(events, {
    showOnlyImportant: activeTab === 'important',
    showOnlyViewed: activeTab === 'viewed',
    subject: selectedSubject || undefined,
  });

  // Further filter by search query
  const searchFilteredEvents = filteredEvents.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const canCreateEvents = selectedGroup && hasPermission(selectedGroupId, 'create');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-telegram-section-bg">
        <Header />
        <div className="p-4 text-center">
          <div className="w-8 h-8 border-2 border-telegram-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка событий...</p>
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

        {/* Header with Create Button */}
        <div className="p-4 bg-telegram-bg border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">События</h1>
            {canCreateEvents && (
              <Button
                className="telegram-button"
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск событий..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Все предметы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все предметы</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <div className="bg-telegram-bg border-b border-gray-100">
            <TabsList className="w-full h-12 bg-transparent">
              <TabsTrigger value="all" className="flex-1">Все</TabsTrigger>
              <TabsTrigger value="important" className="flex-1">Важные</TabsTrigger>
              <TabsTrigger value="viewed" className="flex-1">Просмотренные</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4">
            <TabsContent value="all" className="mt-0">
              <EventsList events={searchFilteredEvents} groupId={selectedGroupId} />
            </TabsContent>
            
            <TabsContent value="important" className="mt-0">
              <EventsList events={searchFilteredEvents} groupId={selectedGroupId} />
            </TabsContent>
            
            <TabsContent value="viewed" className="mt-0">
              <EventsList events={searchFilteredEvents} groupId={selectedGroupId} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <Navigation />

      {showCreateModal && (
        <CreateEventModal
          groupId={selectedGroupId}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function EventsList({ events, groupId }: { events: any[]; groupId: number }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Нет событий</h3>
        <p className="text-muted-foreground">
          События появятся здесь когда они будут созданы
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          groupId={groupId}
        />
      ))}
    </div>
  );
}

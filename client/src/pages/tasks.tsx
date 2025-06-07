import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGroupDeadlines, useTaskSubjects, useTaskFilters } from '@/hooks/useTasks';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import TaskCard from '@/components/TaskCard';
import CreateTaskModal from '@/components/Modals/CreateTaskModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function TasksPage() {
  const { user, groups, hasPermission } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || 0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const { data: deadlines = [], isLoading } = useGroupDeadlines(selectedGroupId);
  const { subjects } = useTaskSubjects(selectedGroupId);

  // Filter tasks based on tab and filters
  const { filteredTasks } = useTaskFilters(deadlines, {
    showCompleted: activeTab === 'completed',
    urgencyLevel: urgencyFilter as any,
    subject: selectedSubject || undefined,
  });

  // Further filter by search query
  const searchFilteredTasks = filteredTasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate by completion status
  const activeTasks = searchFilteredTasks.filter(task => !task.isCompleted);
  const completedTasks = searchFilteredTasks.filter(task => task.isCompleted);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const canCreateTasks = selectedGroup && hasPermission(selectedGroupId, 'create');

  // Count tasks by urgency
  const urgentCount = activeTasks.filter(task => {
    const hoursRemaining = (new Date(task.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursRemaining <= 24;
  }).length;

  const warningCount = activeTasks.filter(task => {
    const hoursRemaining = (new Date(task.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursRemaining > 24 && hoursRemaining <= 72;
  }).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-telegram-section-bg">
        <Header />
        <div className="p-4 text-center">
          <div className="w-8 h-8 border-2 border-telegram-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка задач...</p>
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
            <div>
              <h1 className="text-xl font-semibold">Задачи и дедлайны</h1>
              <div className="flex gap-2 mt-2">
                {urgentCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {urgentCount} срочных
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs">
                    {warningCount} скоро
                  </Badge>
                )}
              </div>
            </div>
            {canCreateTasks && (
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
                placeholder="Поиск задач..."
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

              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все</SelectItem>
                  <SelectItem value="urgent">Срочные</SelectItem>
                  <SelectItem value="warning">Скоро</SelectItem>
                  <SelectItem value="normal">Обычные</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <div className="bg-telegram-bg border-b border-gray-100">
            <TabsList className="w-full h-12 bg-transparent">
              <TabsTrigger value="active" className="flex-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Активные ({activeTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Выполненные ({completedTasks.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4">
            <TabsContent value="active" className="mt-0">
              <TasksList tasks={activeTasks} groupId={selectedGroupId} showCompleted={false} />
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0">
              <TasksList tasks={completedTasks} groupId={selectedGroupId} showCompleted={true} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <Navigation />

      {showCreateModal && (
        <CreateTaskModal
          groupId={selectedGroupId}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function TasksList({ 
  tasks, 
  groupId, 
  showCompleted 
}: { 
  tasks: any[]; 
  groupId: number; 
  showCompleted: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        {showCompleted ? (
          <>
            <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет выполненных задач</h3>
            <p className="text-muted-foreground">
              Выполненные задачи появятся здесь
            </p>
          </>
        ) : (
          <>
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет активных задач</h3>
            <p className="text-muted-foreground">
              Активные задачи появятся здесь когда они будут созданы
            </p>
          </>
        )}
      </div>
    );
  }

  // Sort tasks by urgency for active tasks, by completion date for completed
  const sortedTasks = showCompleted 
    ? tasks.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    : tasks.sort((a, b) => {
        const aTime = new Date(a.endDate).getTime();
        const bTime = new Date(b.endDate).getTime();
        return aTime - bTime;
      });

  return (
    <div className="space-y-4">
      {sortedTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          groupId={groupId}
        />
      ))}
    </div>
  );
}

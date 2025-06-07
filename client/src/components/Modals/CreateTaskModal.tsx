import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateDeadline } from '@/hooks/useTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload, Calendar } from 'lucide-react';
import { telegramWebApp } from '@/lib/telegram';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CreateTaskModalProps {
  groupId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTaskModal({ groupId, isOpen, onClose }: CreateTaskModalProps) {
  const { user } = useAuth();
  const createDeadlineMutation = useCreateDeadline();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    startDate: '',
    endDate: '',
  });

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      telegramWebApp.showAlert('Поддерживаются только изображения (JPEG, PNG, GIF) и видео (MP4, WebM)');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      telegramWebApp.showAlert('Размер файла не должен превышать 10 МБ');
      return;
    }

    setMediaFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleSubmit = async () => {
    if (!user || !formData.title.trim() || !formData.endDate) {
      await telegramWebApp.showAlert('Заполните все обязательные поля');
      return;
    }

    // Validate dates
    const startDate = formData.startDate ? new Date(formData.startDate) : null;
    const endDate = new Date(formData.endDate);
    const now = new Date();

    if (endDate <= now) {
      await telegramWebApp.showAlert('Дата окончания должна быть в будущем');
      return;
    }

    if (startDate && startDate >= endDate) {
      await telegramWebApp.showAlert('Дата начала должна быть раньше даты окончания');
      return;
    }

    try {
      let mediaUrl = null;
      let mediaType = null;

      // In a real app, you would upload the file to a storage service
      // For now, we'll use a placeholder URL
      if (mediaFile) {
        mediaUrl = URL.createObjectURL(mediaFile);
        mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'video';
      }

      await createDeadlineMutation.mutateAsync({
        groupId,
        createdByUserId: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        subject: formData.subject.trim() || null,
        startDate: startDate,
        endDate,
        mediaUrl,
        mediaType,
      });

      telegramWebApp.notificationFeedback('success');
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        subject: '',
        startDate: '',
        endDate: '',
      });
      setMediaFile(null);
      setMediaPreview(null);
    } catch (error) {
      console.error('Failed to create task:', error);
      telegramWebApp.notificationFeedback('error');
    }
  };

  // Set default end date to next week
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 7);
  const defaultEndDateString = format(defaultEndDate, "yyyy-MM-dd'T'HH:mm");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subject */}
          <div>
            <Label htmlFor="subject">Предмет</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Программирование"
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Название задачи *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Курсовая работа"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Подробное описание задачи..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="startDate">Дата начала (опционально)</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">Срок сдачи *</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate || defaultEndDateString}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
              />
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <Label>Прикрепить файл</Label>
            {mediaPreview ? (
              <Card className="mt-2">
                <CardContent className="p-4">
                  <div className="relative">
                    {mediaFile?.type.startsWith('image/') ? (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ) : (
                      <video
                        src={mediaPreview}
                        className="w-full h-40 object-cover rounded-lg"
                        controls
                      />
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={removeMedia}
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {mediaFile?.name} ({Math.round((mediaFile?.size || 0) / 1024)} КБ)
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="mt-2">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Card className="border-2 border-dashed border-gray-300 hover:border-telegram-blue transition-colors cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Нажмите для выбора файла</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Поддерживаются изображения и видео (до 10 МБ)
                      </p>
                    </CardContent>
                  </Card>
                </label>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 telegram-button"
              onClick={handleSubmit}
              disabled={createDeadlineMutation.isPending || !formData.title.trim() || !formData.endDate}
            >
              {createDeadlineMutation.isPending ? 'Создание...' : 'Создать задачу'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

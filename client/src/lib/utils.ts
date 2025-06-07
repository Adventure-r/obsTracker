import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeRemaining(endDate: Date | string): string {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Просрочено';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
  } else {
    return `${minutes} ${minutes === 1 ? 'минута' : minutes < 5 ? 'минуты' : 'минут'}`;
  }
}

export function getUrgencyLevel(endDate: Date | string): 'urgent' | 'warning' | 'normal' {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  const hours = diff / (1000 * 60 * 60);

  if (hours <= 24) {
    return 'urgent';
  } else if (hours <= 72) {
    return 'warning';
  } else {
    return 'normal';
  }
}

export function getUserDisplayName(user: { firstName: string; lastName: string; middleName?: string | null }): string {
  const parts = [user.firstName, user.lastName];
  if (user.middleName) {
    parts.splice(1, 0, user.middleName);
  }
  return parts.join(' ');
}

export function getUserShortName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName.charAt(0)}.`;
}

export function getRoleDisplayName(role: 'leader' | 'assistant' | 'member'): string {
  switch (role) {
    case 'leader':
      return 'Староста';
    case 'assistant':
      return 'Помощник';
    case 'member':
      return 'Участник';
    default:
      return 'Участник';
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function generateInviteLink(token: string): string {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseUrl}/invite/${token}`;
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    document.body.prepend(textArea);
    textArea.select();
    return new Promise((resolve, reject) => {
      try {
        document.execCommand('copy') ? resolve() : reject();
      } catch (error) {
        reject(error);
      } finally {
        textArea.remove();
      }
    });
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          start_param?: string;
        };
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          isVisible: boolean;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        showPopup: (params: {
          title?: string;
          message: string;
          buttons?: Array<{
            id?: string;
            type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
            text: string;
          }>;
        }, callback?: (buttonId: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
      };
    };
  }
}

export class TelegramWebApp {
  private static instance: TelegramWebApp;
  private webApp: NonNullable<Window['Telegram']>['WebApp'] | null = null;

  private constructor() {
    this.webApp = window.Telegram?.WebApp || null;
    if (this.webApp) {
      this.webApp.ready();
      this.webApp.expand();
    }
  }

  static getInstance(): TelegramWebApp {
    if (!TelegramWebApp.instance) {
      TelegramWebApp.instance = new TelegramWebApp();
    }
    return TelegramWebApp.instance;
  }

  isAvailable(): boolean {
    return this.webApp !== null;
  }

  getUser() {
    return this.webApp?.initDataUnsafe?.user || null;
  }

  getStartParam(): string | null {
    return this.webApp?.initDataUnsafe?.start_param || null;
  }

  getColorScheme(): 'light' | 'dark' {
    return this.webApp?.colorScheme || 'light';
  }

  getThemeParams() {
    return this.webApp?.themeParams || {};
  }

  // Haptic feedback
  impactFeedback(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') {
    this.webApp?.HapticFeedback?.impactOccurred(style);
  }

  notificationFeedback(type: 'error' | 'success' | 'warning') {
    this.webApp?.HapticFeedback?.notificationOccurred(type);
  }

  selectionFeedback() {
    this.webApp?.HapticFeedback?.selectionChanged();
  }

  // Main Button
  setMainButton(text: string, callback: () => void) {
    if (this.webApp?.MainButton) {
      this.webApp.MainButton.setText(text);
      this.webApp.MainButton.onClick(callback);
      this.webApp.MainButton.show();
    }
  }

  hideMainButton() {
    this.webApp?.MainButton?.hide();
  }

  enableMainButton() {
    this.webApp?.MainButton?.enable();
  }

  disableMainButton() {
    this.webApp?.MainButton?.disable();
  }

  // Back Button
  setBackButton(callback: () => void) {
    if (this.webApp?.BackButton) {
      this.webApp.BackButton.onClick(callback);
      this.webApp.BackButton.show();
    }
  }

  hideBackButton() {
    this.webApp?.BackButton?.hide();
  }

  // Popups
  showAlert(message: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.webApp?.showAlert) {
        this.webApp.showAlert(message, resolve);
      } else {
        alert(message);
        resolve();
      }
    });
  }

  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.webApp?.showConfirm) {
        this.webApp.showConfirm(message, resolve);
      } else {
        resolve(confirm(message));
      }
    });
  }

  showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }): Promise<string> {
    return new Promise((resolve) => {
      if (this.webApp?.showPopup) {
        this.webApp.showPopup(params, (buttonId) => {
          resolve(buttonId);
        });
      } else {
        // Fallback for development
        const result = confirm(params.message);
        resolve(result ? 'ok' : 'cancel');
      }
    });
  }

  // Close the app
  close() {
    this.webApp?.close();
  }

  // Get viewport info
  getViewportHeight(): number {
    return this.webApp?.viewportHeight || window.innerHeight;
  }

  getViewportStableHeight(): number {
    return this.webApp?.viewportStableHeight || window.innerHeight;
  }

  isExpanded(): boolean {
    return this.webApp?.isExpanded || false;
  }
}

export const telegramWebApp = TelegramWebApp.getInstance();

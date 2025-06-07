import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { telegramWebApp } from "@/lib/telegram";
import { useEffect } from "react";

// Pages
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import EventsPage from "@/pages/events";
import CalendarPage from "@/pages/calendar";
import TasksPage from "@/pages/tasks";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

function AppContent() {
  const { isAuthenticated, isLoading, groups } = useAuth();
  const [location, setLocation] = useLocation();

  // Initialize Telegram Web App
  useEffect(() => {
    if (telegramWebApp.isAvailable()) {
      // Apply Telegram theme
      const themeParams = telegramWebApp.getThemeParams();
      const colorScheme = telegramWebApp.getColorScheme();
      
      document.documentElement.setAttribute('data-theme', colorScheme);
      
      if (themeParams.bg_color) {
        document.documentElement.style.setProperty('--telegram-bg', themeParams.bg_color);
      }
      
      if (themeParams.text_color) {
        document.documentElement.style.setProperty('--telegram-text', themeParams.text_color);
      }
    }
  }, []);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-telegram-section-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Handle invitation links
  useEffect(() => {
    const path = location;
    if (path.startsWith('/invite/')) {
      const token = path.split('/invite/')[1];
      if (token && isAuthenticated) {
        // Handle invitation acceptance
        setLocation('/dashboard');
      }
    }
  }, [location, isAuthenticated, setLocation]);

  // Show auth screen if not authenticated or no groups
  if (!isAuthenticated || groups.length === 0) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-telegram-section-bg">
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/events" component={EventsPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/invite/:token" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="tg-viewport">
          <div className="tg-safe-area">
            <AppContent />
            <Toaster />
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

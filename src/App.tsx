import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { toast } from "sonner";

import { AuthProvider } from "@/auth/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { InstallPWA } from "@/components/InstallPWA";
import AppBackgroundLayout from "./layouts/AppBackgroundLayout";
import { AppRoutes } from "./routes";

// Configure React Query with proper defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // Data is fresh for 1 minute
      gcTime: 5 * 60 * 1000, // Cache kept for 5 minutes (was cacheTime in v4)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch when reconnecting
      retry: 1, // Retry failed requests once
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0, // Don't retry mutations
      onError: (error: any) => {
        // Global error handler for mutations
        toast.error(error?.message || 'An error occurred');
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider
        defaultTheme="dark"
        storageKey="vite-ui-theme"
        attribute="class"
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPWA />

          <BrowserRouter>
            <AppBackgroundLayout>
              <AppRoutes />
            </AppBackgroundLayout>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

// Pages
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import DomainsPage from "@/pages/domains";
import LandingPagesPage from "@/pages/landing-pages";
import LogsPage from "@/pages/logs";
import BlacklistPage from "@/pages/blacklist";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      if (location === '/' || location === '') {
        window.location.href = '/maintenance';
      } else {
        setLocation("/login");
      }
    }
  }, [user, isLoading, setLocation, location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-mono text-sm tracking-wider animate-pulse">BOSS CLOAKER v3.2</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">{() => <ProtectedRoute component={DashboardPage} />}</Route>
      <Route path="/domains">{() => <ProtectedRoute component={DomainsPage} />}</Route>
      <Route path="/landing-pages">{() => <ProtectedRoute component={LandingPagesPage} />}</Route>
      <Route path="/logs">{() => <ProtectedRoute component={LogsPage} />}</Route>
      <Route path="/blacklist">{() => <ProtectedRoute component={BlacklistPage} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={SettingsPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

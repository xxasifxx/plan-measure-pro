import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import ProjectControls from "./pages/ProjectControls";
import Demo from "./pages/Demo";
import McfaPitch from "./pages/McfaPitch";
import FajarPitch from "./pages/FajarPitch";
import P6XmlDemo from "./pages/P6XmlDemo";
import P6Export from "./pages/P6Export";
import ReReview from "./pages/ReReview";
import DailyReport from "./pages/DailyReport";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Wbs from "./pages/Wbs";
import { PwaShell } from "@/components/PwaShell";
import { BiometricGate } from "@/components/BiometricGate";
import { NativeFirstRun } from "@/components/NativeFirstRun";
import { createIdbPersister } from "@/lib/offline/idb-persister";

// 14 days; bust on app version (Vite injects from package.json via env if defined).
const PERSIST_BUSTER = import.meta.env.VITE_APP_VERSION || "v1";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 14, // keep cache long enough to persist
      staleTime: 1000 * 30,
    },
  },
});

// Persist only project-domain queries; skip auth/realtime ephemera.
const PERSIST_PREFIXES = [
  "projects", "project", "pay-items", "annotations", "calibrations",
  "documents", "daily-report", "schedule", "specs", "notifications",
  "team", "members", "rocks", "scorecard",
];

function shouldDehydrateQuery(query: { queryKey: readonly unknown[] }): boolean {
  const head = query.queryKey?.[0];
  if (typeof head !== "string") return false;
  return PERSIST_PREFIXES.some((p) => head === p || head.startsWith(p));
}

function PersistedQueryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userScope = user?.id || "anon";
  const persistOptions = useMemo(
    () => ({
      persister: createIdbPersister(userScope),
      buster: `${PERSIST_BUSTER}:${userScope}`,
      maxAge: 1000 * 60 * 60 * 24 * 14,
      dehydrateOptions: { shouldDehydrateQuery },
    }),
    [userScope]
  );
  // Re-mount when the user changes so we never restore another user's cache.
  return (
    <PersistQueryClientProvider key={userScope} client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/landing" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/landing" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PersistedQueryProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PwaShell />
          <BiometricGate>
            <NativeFirstRun />
            <BrowserRouter>
              <Routes>
                <Route path="/landing" element={<Landing />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/mcfa" element={<McfaPitch />} />
                <Route path="/fajar" element={<FajarPitch />} />
                <Route path="/p6-xml" element={<P6XmlDemo />} />
                <Route path="/mcfa/p6-xml" element={<P6XmlDemo />} />
                <Route path="/wbs" element={<Wbs />} />
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/project/:projectId" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/project/:projectId/controls" element={<ProtectedRoute><ProjectControls /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/re-review" element={<ProtectedRoute><ReReview /></ProtectedRoute>} />
                <Route path="/project/:projectId/daily-report" element={<ProtectedRoute><DailyReport /></ProtectedRoute>} />
                <Route path="/project/:projectId/p6-export" element={<ProtectedRoute><P6Export /></ProtectedRoute>} />
                <Route path="/project/:projectId/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </BiometricGate>
        </TooltipProvider>
      </PersistedQueryProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

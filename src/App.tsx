import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Movies from "./pages/Movies";
import MovieDetail from "./pages/MovieDetail";
import TV from "./pages/TV";
import TVDetail from "./pages/TVDetail";
import Anime from "./pages/Anime";
import Actors from "./pages/Actors";
import PersonDetail from "./pages/PersonDetail";
import Profile from "./pages/Profile";
import AddFriend from "./pages/AddFriend";
import Settings from "./pages/Settings";
import Chat from "./pages/Chat";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import WatchPage from "./pages/WatchPage";
import Trending from "./pages/Trending";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Home />} />
      <Route path="/movies" element={<Movies />} />
      <Route path="/movie/:id" element={<MovieDetail />} />
      <Route path="/tv" element={<TV />} />
      <Route path="/tv/:id" element={<TVDetail />} />
      <Route path="/anime" element={<Anime />} />
      <Route path="/actors" element={<Actors />} />
      <Route path="/person/:id" element={<PersonDetail />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/add-friend/:profileId" element={<AddFriend />} />
      <Route path="/add-friend" element={<AddFriend />} />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/watch"
        element={
          <ProtectedRoute>
            <WatchPage />
          </ProtectedRoute>
        }
      />
      <Route path="/trending" element={<Trending />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

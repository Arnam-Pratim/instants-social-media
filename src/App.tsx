import { AuthProvider, useAuth } from './lib/auth';
import { RouterProvider, useRouter } from './lib/router';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import ProfilePage from './pages/ProfilePage';
import ReelsPage from './pages/ReelsPage';
import ComposerModal from './components/ComposerModal';
import { Zap } from 'lucide-react';

function Routes() {
  const { path } = useRouter();
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <span className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-white">
            <Zap className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <p className="text-sm">Loading Instants…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (path === '/signup') return <SignupPage />;
    return <LoginPage />;
  }

  if (path === '/compose') {
    return (
      <AppShell>
        <ComposerModal />
        <HomePage />
      </AppShell>
    );
  }

  if (path === '/explore') {
    return (
      <AppShell>
        <ExplorePage />
      </AppShell>
    );
  }

  if (path === '/reels') {
    return (
      <AppShell>
        <ReelsPage />
      </AppShell>
    );
  }

  if (path.startsWith('/u/')) {
    const username = decodeURIComponent(path.slice(3));
    return (
      <AppShell>
        <ProfilePage username={username} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <HomePage />
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <Routes />
      </RouterProvider>
    </AuthProvider>
  );
}

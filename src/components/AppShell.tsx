import { type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { Link, useRouter } from '../lib/router';
import { avatarFor } from '../lib/utils';
import { Home, Compass, User as UserIcon, Zap, LogOut, Plus, Clapperboard } from 'lucide-react';

export default function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { path, navigate } = useRouter();

  const navItems = [
    { to: '/', label: 'Home', icon: Home, active: path === '/' },
    { to: '/explore', label: 'Explore', icon: Compass, active: path === '/explore' },
    { to: '/reels', label: 'Reels', icon: Clapperboard, active: path === '/reels' },
    {
      to: `/u/${profile?.username ?? ''}`,
      label: 'Profile',
      icon: UserIcon,
      active: path.startsWith('/u/'),
    },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2 text-xl font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-md shadow-sky-200">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </span>
          Instants
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                item.active
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className="h-5 w-5" strokeWidth={item.active ? 2.4 : 2} />
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => navigate('/compose')}
            className="btn-primary mt-4 w-full"
          >
            <Plus className="h-4 w-4" /> New post
          </button>
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-xl border border-slate-200 p-3">
          <img
            src={avatarFor(profile?.username ?? '', profile?.avatar_url ?? null)}
            alt=""
            className="h-9 w-9 rounded-full bg-slate-100"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name}</p>
            <p className="truncate text-xs text-slate-500">@{profile?.username}</p>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-cyan-500 text-white">
            <Zap className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Instants
        </Link>
        <button onClick={() => navigate('/compose')} className="btn-primary !px-3 !py-1.5">
          <Plus className="h-4 w-4" /> Post
        </button>
      </header>

      <main className="min-w-0 flex-1">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`grid h-10 w-12 place-items-center rounded-xl transition ${
              item.active ? 'text-sky-600' : 'text-slate-500'
            }`}
          >
            <item.icon className="h-6 w-6" strokeWidth={item.active ? 2.4 : 2} />
          </Link>
        ))}
      </nav>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { Link, useRouter } from '../lib/router';
import { Zap } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
    } else {
      navigate('/');
    }
  };

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-lg shadow-sky-200">
            <Zap className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to your Instants account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-sky-600 hover:text-sky-700">
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">{children}</div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 lg:block">
        <div className="absolute inset-0 opacity-20" style={blobStyle(0)} />
        <div className="absolute inset-0 opacity-20" style={blobStyle(1)} />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Zap className="h-6 w-6" strokeWidth={2.5} /> Instants
          </div>
          <div>
            <h2 className="max-w-md text-4xl font-bold leading-tight">
              Share your moments. Instantly.
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              A modern space for quick posts, real conversations, and the people you care about.
            </p>
            <div className="mt-8 flex gap-6">
              <Stat label="Posts" value="12M+" />
              <Stat label="People" value="1.4M" />
              <Stat label="Hearts" value="89M" />
            </div>
          </div>
          <p className="text-sm text-white/60">© {new Date().getFullYear()} Instants</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-white/70">{label}</div>
    </div>
  );
}

function blobStyle(i: number): React.CSSProperties {
  return {
    backgroundImage: `radial-gradient(circle at ${i ? '70% 30%' : '30% 70%'}, rgba(255,255,255,0.4), transparent 50%)`,
  };
}

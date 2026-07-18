import { useEffect } from 'react';
import { useRouter, Link } from '../lib/router';
import Composer from './Composer';
import { X } from 'lucide-react';

export default function ComposerModal() {
  const { navigate } = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 pt-16 backdrop-blur-sm">
      <div className="w-full max-w-xl animate-fade-up">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h3 className="font-semibold text-slate-900">Create a post</h3>
            <Link
              to="/"
              onClick={() => navigate('/')}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </Link>
          </div>
          <div className="p-4">
            <Composer onPosted={() => navigate('/')} />
          </div>
        </div>
      </div>
    </div>
  );
}

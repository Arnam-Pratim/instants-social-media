import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { avatarFor } from '../lib/utils';
import { ImagePlus, X, Loader2 } from 'lucide-react';

export default function Composer({ onPosted }: { onPosted?: () => void }) {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImage, setShowImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl) return;
    setSubmitting(true);
    setError(null);
    const { error } = await supabase
      .from('posts')
      .insert({ content: content.trim(), image_url: imageUrl.trim() || null });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setContent('');
    setImageUrl('');
    setShowImage(false);
    onPosted?.();
  };

  return (
    <form onSubmit={submit} className="card p-4">
      <div className="flex items-start gap-3">
        <img
          src={avatarFor(profile?.username ?? '', profile?.avatar_url ?? null)}
          alt=""
          className="h-11 w-11 rounded-full bg-slate-100"
        />
        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="What's happening right now?"
            className="w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-slate-900 placeholder-slate-400 outline-none"
          />

          {showImage && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL (https://…)"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setShowImage(false);
                  setImageUrl('');
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {imageUrl && (
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
              <img src={imageUrl} alt="" className="max-h-64 w-full object-cover" />
            </div>
          )}

          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowImage((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-full text-sky-600 transition hover:bg-sky-50"
              title="Add image"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={submitting || (!content.trim() && !imageUrl)}
              className="btn-primary"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

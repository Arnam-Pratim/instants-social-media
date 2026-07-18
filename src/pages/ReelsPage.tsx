import { useCallback, useEffect, useState } from 'react';
import { supabase, type PostWithProfile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Link } from '../lib/router';
import { avatarFor, timeAgo } from '../lib/utils';
import { Heart, MessageCircle, Loader2, Film, ChevronUp, ChevronDown } from 'lucide-react';

type Reel = PostWithProfile & {
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export default function ReelsPage() {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // IDs of people I follow
    const { data: following } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', user.id);
    const followeeIds = (following ?? []).map((f) => f.followee_id);
    // Include my own posts too, so the reel is never empty for a new user.
    const scopeIds = [...followeeIds, user.id];

    let rows: PostWithProfile[] = [];
    if (scopeIds.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(
          'id, user_id, content, image_url, created_at, profiles:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)',
        )
        .in('user_id', scopeIds)
        .order('created_at', { ascending: false })
        .limit(40);
      rows = (data as unknown as PostWithProfile[]) ?? [];
    }

    if (rows.length === 0) {
      setReels([]);
      setLoading(false);
      return;
    }

    const postIds = rows.map((r) => r.id);
    const [{ data: likes }, { data: comments }, { data: myLikes }] = await Promise.all([
      supabase.from('likes').select('post_id').in('post_id', postIds),
      supabase.from('comments').select('post_id').in('post_id', postIds),
      supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
    ]);

    const likeMap = new Map<string, number>();
    (likes ?? []).forEach((l) => likeMap.set(l.post_id, (likeMap.get(l.post_id) ?? 0) + 1));
    const commentMap = new Map<string, number>();
    (comments ?? []).forEach((c) => commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1));
    const myLikeSet = new Set((myLikes ?? []).map((l) => l.post_id));

    setReels(
      rows.map((p) => ({
        ...p,
        like_count: likeMap.get(p.id) ?? 0,
        comment_count: commentMap.get(p.id) ?? 0,
        liked_by_me: myLikeSet.has(p.id),
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLike = async (reel: Reel) => {
    if (!user) return;
    if (reel.liked_by_me) {
      await supabase.from('likes').delete().eq('post_id', reel.id).eq('user_id', user.id);
      setReels((prev) =>
        prev.map((p) =>
          p.id === reel.id ? { ...p, liked_by_me: false, like_count: Math.max(0, p.like_count - 1) } : p,
        ),
      );
    } else {
      await supabase.from('likes').insert({ post_id: reel.id, user_id: user.id });
      setReels((prev) =>
        prev.map((p) =>
          p.id === reel.id ? { ...p, liked_by_me: true, like_count: p.like_count + 1 } : p,
        ),
      );
    }
  };

  const scrollToIndex = (i: number) => {
    const el = document.getElementById(`reel-${i}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setActiveIndex(i);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-1rem)] items-center justify-center bg-slate-900 text-slate-400 md:h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-900 px-6">
        <div className="card max-w-md bg-white/95 p-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-500">
            <Film className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">No reels yet</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Follow people from Explore to see their posts here in a vertical, swipeable reel.
          </p>
          <Link to="/explore" className="btn-primary mt-6 inline-flex">
            Find people to follow
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-1rem)] overflow-y-auto bg-slate-900 no-scrollbar snap-y snap-mandatory md:h-screen">
      {reels.map((reel, i) => {
        const author = reel.profiles;
        return (
          <section
            key={reel.id}
            id={`reel-${i}`}
            className="flex h-[calc(100vh-1rem)] snap-center items-center justify-center px-4 py-6 md:h-screen"
          >
            <div className="relative h-full max-h-[80vh] w-full max-w-md overflow-hidden rounded-3xl bg-slate-800 shadow-2xl">
              {/* Media */}
              {reel.image_url ? (
                <img
                  src={reel.image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 p-8">
                  <p className="whitespace-pre-wrap text-center text-xl font-medium leading-relaxed text-white">
                    {reel.content}
                  </p>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

              {/* Top bar */}
              <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
                <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90 backdrop-blur">
                  Reels
                </span>
                <span className="rounded-full bg-black/30 px-3 py-1 text-xs text-white/80 backdrop-blur">
                  {i + 1} / {reels.length}
                </span>
              </div>

              {/* Side actions */}
              <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5">
                <button
                  onClick={() => toggleLike(reel)}
                  className="flex flex-col items-center gap-1 text-white transition active:scale-90"
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full bg-black/30 backdrop-blur ${
                      reel.liked_by_me ? 'text-rose-500' : 'hover:bg-black/50'
                    }`}
                  >
                    <Heart className={`h-6 w-6 ${reel.liked_by_me ? 'fill-rose-500 animate-pop' : ''}`} />
                  </span>
                  <span className="text-xs font-medium tabular-nums">{reel.like_count}</span>
                </button>
                <div className="flex flex-col items-center gap-1 text-white">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-black/30 backdrop-blur">
                    <MessageCircle className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-medium tabular-nums">{reel.comment_count}</span>
                </div>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-16 p-4">
                <Link
                  to={`/u/${author?.username ?? ''}`}
                  className="flex items-center gap-2.5 text-white"
                >
                  <img
                    src={avatarFor(author?.username ?? '', author?.avatar_url ?? null)}
                    alt=""
                    className="h-10 w-10 rounded-full ring-2 ring-white/80"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold drop-shadow">
                      {author?.full_name ?? 'Unknown'}
                    </p>
                    <p className="truncate text-xs text-white/70">@{author?.username}</p>
                  </div>
                </Link>
                {reel.image_url && reel.content && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/90 drop-shadow">
                    {reel.content}
                  </p>
                )}
                <p className="mt-2 text-xs text-white/60">{timeAgo(reel.created_at)}</p>
              </div>
            </div>
          </section>
        );
      })}

      {/* Desktop scroll controls */}
      <div className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 md:flex">
        <button
          onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          onClick={() => scrollToIndex(Math.min(reels.length - 1, activeIndex + 1))}
          disabled={activeIndex === reels.length - 1}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

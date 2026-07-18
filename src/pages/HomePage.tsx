import { useCallback, useEffect, useState } from 'react';
import { supabase, type PostWithProfile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import Composer from '../components/Composer';
import PostCard from '../components/PostCard';
import { Loader2 } from 'lucide-react';

type FeedPost = PostWithProfile & {
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export default function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select(
        'id, user_id, content, image_url, created_at, profiles:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)',
      )
      .order('created_at', { ascending: false })
      .limit(50);
    const rows = (data as unknown as PostWithProfile[]) ?? [];

    if (rows.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = rows.map((r) => r.id);
    const [{ data: likes }, { data: comments }, { data: myLikes }] = await Promise.all([
      supabase.from('likes').select('post_id').in('post_id', postIds),
      supabase.from('comments').select('post_id').in('post_id', postIds),
      user
        ? supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
        : Promise.resolve({ data: [] as { post_id: string }[] | null }),
    ]);

    const likeMap = new Map<string, number>();
    (likes ?? []).forEach((l) => likeMap.set(l.post_id, (likeMap.get(l.post_id) ?? 0) + 1));
    const commentMap = new Map<string, number>();
    (comments ?? []).forEach((c) => commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1));
    const myLikeSet = new Set((myLikes ?? []).map((l) => l.post_id));

    setPosts(
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

  const handleLikeChange = (postId: string, liked: boolean, count: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, like_count: count, liked_by_me: liked } : p)),
    );
  };

  const handleCommentAdded = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)),
    );
  };

  const handleDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Home</h1>
        <span className="chip">Latest first</span>
      </div>

      <div className="mb-6">
        <Composer onPosted={load} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              likeCount={p.like_count}
              commentCount={p.comment_count}
              likedByMe={p.liked_by_me}
              onLikeChange={handleLikeChange}
              onCommentAdded={handleCommentAdded}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-500">
        <Loader2 className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Your feed is quiet</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Be the first to share something. Or head to Explore to find people to follow.
      </p>
    </div>
  );
}

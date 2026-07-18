import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, type PostWithProfile } from '../lib/supabase';
import { Link } from '../lib/router';
import { avatarFor, timeAgo } from '../lib/utils';
import { Heart, MessageCircle, Trash2, Send } from 'lucide-react';

type Props = {
  post: PostWithProfile;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  onLikeChange: (postId: string, liked: boolean, count: number) => void;
  onCommentAdded: (postId: string) => void;
  onDeleted?: (postId: string) => void;
};

export default function PostCard({
  post,
  likeCount,
  commentCount,
  likedByMe,
  onLikeChange,
  onCommentAdded,
  onDeleted,
}: Props) {
  const { user, profile } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<
    { id: string; content: string; created_at: string; profiles: { username: string; avatar_url: string | null } | null }[]
  >([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (busy || !user) return;
    setBusy(true);
    if (likedByMe) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      onLikeChange(post.id, false, Math.max(0, likeCount - 1));
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      onLikeChange(post.id, true, likeCount + 1);
    }
    setBusy(false);
  };

  const loadComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, profiles:profiles!comments_user_id_fkey(username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments((data as any) ?? []);
    setLoadingComments(false);
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments((v) => !v);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setSubmitting(true);
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: post.id, content: commentText.trim() })
      .select('id, content, created_at, profiles:profiles!comments_user_id_fkey(username, avatar_url)')
      .maybeSingle();
    if (data) {
      setComments((c) => [...c, data as any]);
      setCommentText('');
      onCommentAdded(post.id);
    }
    setSubmitting(false);
  };

  const deletePost = async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error) onDeleted?.(post.id);
  };

  const author = post.profiles;
  const isMine = user?.id === post.user_id;

  return (
    <article className="card animate-fade-up overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <Link to={`/u/${author?.username ?? ''}`}>
          <img
            src={avatarFor(author?.username ?? '', author?.avatar_url ?? null)}
            alt=""
            className="h-11 w-11 rounded-full bg-slate-100 ring-1 ring-slate-100"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/u/${author?.username ?? ''}`}
              className="truncate font-semibold text-slate-900 hover:underline"
            >
              {author?.full_name ?? 'Unknown'}
            </Link>
            <span className="truncate text-sm text-slate-400">@{author?.username}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-400">{timeAgo(post.created_at)}</span>
            {isMine && (
              <button
                onClick={deletePost}
                className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                title="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800">
            {post.content}
          </p>

          {post.image_url && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              <img src={post.image_url} alt="" className="max-h-[520px] w-full object-cover" />
            </div>
          )}

          <div className="mt-3 flex items-center gap-1">
            <button
              onClick={toggleLike}
              disabled={busy}
              className={`group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition ${
                likedByMe ? 'text-rose-600' : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              <Heart
                className={`h-5 w-5 ${likedByMe ? 'animate-pop fill-rose-500' : 'group-hover:fill-rose-100'}`}
              />
              <span className="tabular-nums">{likeCount}</span>
            </button>

            <button
              onClick={toggleComments}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="tabular-nums">{commentCount}</span>
            </button>
          </div>

          {showComments && (
            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
              {loadingComments && <p className="text-sm text-slate-400">Loading…</p>}
              {!loadingComments && comments.length === 0 && (
                <p className="text-sm text-slate-400">No comments yet. Start the conversation.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <img
                    src={avatarFor(c.profiles?.username ?? '', c.profiles?.avatar_url ?? null)}
                    alt=""
                    className="mt-0.5 h-8 w-8 rounded-full bg-slate-100"
                  />
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-800">
                      {c.profiles?.username ?? 'user'}
                    </span>{' '}
                    <span className="text-slate-700">{c.content}</span>
                    <div className="mt-0.5 text-xs text-slate-400">{timeAgo(c.created_at)}</div>
                  </div>
                </div>
              ))}

              <form onSubmit={submitComment} className="flex items-center gap-2">
                <img
                  src={avatarFor(profile?.username ?? '', profile?.avatar_url ?? null)}
                  alt=""
                  className="h-8 w-8 rounded-full bg-slate-100"
                />
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="grid h-9 w-9 place-items-center rounded-full bg-sky-500 text-white transition hover:bg-sky-600 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

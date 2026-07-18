import { useCallback, useEffect, useState } from 'react';
import { supabase, type PostWithProfile, type Profile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Link, useRouter } from '../lib/router';
import { avatarFor, formatCount } from '../lib/utils';
import PostCard from '../components/PostCard';
import { Loader2, Pencil, UserPlus, Check, X, CalendarDays } from 'lucide-react';

type ProfilePost = PostWithProfile & {
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export default function ProfilePage({ username }: { username: string }) {
  const { user, profile: me, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isMe = profile?.id === user?.id;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    const p = prof as Profile | null;
    setProfile(p);
    if (!p) {
      setLoading(false);
      return;
    }

    const { data: postRows } = await supabase
      .from('posts')
      .select(
        'id, user_id, content, image_url, created_at, profiles:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)',
      )
      .eq('user_id', p.id)
      .order('created_at', { ascending: false });
    const rows = (postRows as unknown as PostWithProfile[]) ?? [];
    const postIds = rows.map((r) => r.id);

    const [{ data: likes }, { data: comments }, { data: myLikes }, { data: followers }, { data: following }, { data: myFollow }] =
      await Promise.all([
        supabase.from('likes').select('post_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
        user
          ? supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
          : Promise.resolve({ data: [] as { post_id: string }[] | null }),
        supabase.from('follows').select('follower_id').eq('followee_id', p.id),
        supabase.from('follows').select('followee_id').eq('follower_id', p.id),
        user
          ? supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('followee_id', p.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    const likeMap = new Map<string, number>();
    (likes ?? []).forEach((l) => likeMap.set(l.post_id, (likeMap.get(l.post_id) ?? 0) + 1));
    const commentMap = new Map<string, number>();
    (comments ?? []).forEach((c) => commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1));
    const myLikeSet = new Set((myLikes ?? []).map((l) => l.post_id));

    setPosts(
      rows.map((p2) => ({
        ...p2,
        like_count: likeMap.get(p2.id) ?? 0,
        comment_count: commentMap.get(p2.id) ?? 0,
        liked_by_me: myLikeSet.has(p2.id),
      })),
    );
    setFollowerCount((followers ?? []).length);
    setFollowingCount((following ?? []).length);
    setIsFollowing(!!(myFollow as any));
    setLoading(false);
  }, [username, user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = async () => {
    if (!user || !profile || isMe) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowerCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    if (next) {
      await supabase.from('follows').insert({ follower_id: user.id, followee_id: profile.id });
    } else {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', profile.id);
    }
  };

  const handleLikeChange = (postId: string, liked: boolean, count: number) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, like_count: count, liked_by_me: liked } : p)));
  };
  const handleCommentAdded = (postId: string) =>
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)));
  const handleDeleted = (postId: string) => setPosts((prev) => prev.filter((p) => p.id !== postId));

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">User not found</h1>
        <p className="mt-1 text-sm text-slate-500">No one with that username exists.</p>
        <Link to="/explore" className="btn-primary mt-6 inline-flex">
          Find people
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-10">
      <div className="h-40 bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-400 md:h-52" />
      <div className="mx-auto max-w-3xl px-4">
        <div className="-mt-12 flex items-end justify-between">
          <img
            src={avatarFor(profile.username, profile.avatar_url)}
            alt=""
            className="h-24 w-24 rounded-2xl border-4 border-white bg-white shadow-md md:h-28 md:w-28"
          />
          {isMe ? (
            <button onClick={() => setEditing(true)} className="btn-outline">
              <Pencil className="h-4 w-4" /> Edit profile
            </button>
          ) : user ? (
            <button
              onClick={toggleFollow}
              className={isFollowing ? 'btn-outline' : 'btn-primary'}
            >
              {isFollowing ? (
                <>
                  <Check className="h-4 w-4" /> Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Follow
                </>
              )}
            </button>
          ) : null}
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {profile.full_name ?? profile.username}
          </h1>
          <p className="text-sm text-slate-500">@{profile.username}</p>
          {profile.bio && <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{profile.bio}</p>}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays className="h-4 w-4" />
            Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
          <div className="mt-4 flex gap-6">
            <span>
              <strong className="text-slate-900">{formatCount(followingCount)}</strong>{' '}
              <span className="text-slate-500">Following</span>
            </span>
            <span>
              <strong className="text-slate-900">{formatCount(followerCount)}</strong>{' '}
              <span className="text-slate-500">Followers</span>
            </span>
            <span>
              <strong className="text-slate-900">{formatCount(posts.length)}</strong>{' '}
              <span className="text-slate-500">Posts</span>
            </span>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Posts</h2>
          {posts.length === 0 ? (
            <p className="card px-4 py-10 text-center text-sm text-slate-500">
              {isMe ? "You haven't posted yet. Share your first instant!" : 'No posts yet.'}
            </p>
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
      </div>

      {editing && (
        <EditProfileModal
          profile={me!}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            await refreshProfile();
            await load();
            setEditing(false);
          }}
          onSignOut={() => navigate('/login')}
        />
      )}
    </div>
  );
}

function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
  onSignOut: () => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="card w-full max-w-md animate-fade-up overflow-hidden rounded-b-none sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="font-semibold text-slate-900">Edit profile</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={save} className="space-y-4 p-4">
          <div className="flex items-center gap-4">
            <img
              src={avatarFor(profile.username, avatarUrl || null)}
              alt=""
              className="h-16 w-16 rounded-2xl bg-slate-100"
            />
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Avatar URL
              </label>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="input"
                placeholder="https://…"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Full name
            </label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              className="input resize-none"
              placeholder="A short bio…"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{bio.length}/200</p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

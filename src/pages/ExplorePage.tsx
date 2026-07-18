import { useCallback, useEffect, useState } from 'react';
import { supabase, type PostWithProfile, type Profile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Link } from '../lib/router';
import { avatarFor, formatCount } from '../lib/utils';
import { Loader2, Search, TrendingUp, UserPlus, Check } from 'lucide-react';

type SuggestedUser = Profile & { post_count: number; follower_count: number; following: boolean };

export default function ExplorePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'trending' | 'people' | 'search'>('trending');

  const [trending, setTrending] = useState<PostWithProfile[]>([]);
  const [people, setPeople] = useState<SuggestedUser[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrending = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select(
        'id, user_id, content, image_url, created_at, profiles:profiles!posts_user_id_fkey(id, username, full_name, avatar_url)',
      )
      .order('created_at', { ascending: false })
      .limit(24);
    setTrending((data as unknown as PostWithProfile[]) ?? []);
  }, []);

  const loadPeople = useCallback(async () => {
    if (!user) return;
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .limit(50);
    const rows = (profiles as Profile[]) ?? [];
    if (rows.length === 0) {
      setPeople([]);
      return;
    }
    const ids = rows.map((r) => r.id);
    const [{ data: posts }, { data: follows }, { data: myFollows }] = await Promise.all([
      supabase.from('posts').select('user_id').in('user_id', ids),
      supabase.from('follows').select('followee_id').in('followee_id', ids),
      supabase.from('follows').select('followee_id').eq('follower_id', user.id),
    ]);
    const postMap = new Map<string, number>();
    (posts ?? []).forEach((p) => postMap.set(p.user_id, (postMap.get(p.user_id) ?? 0) + 1));
    const followerMap = new Map<string, number>();
    (follows ?? []).forEach((f) =>
      followerMap.set(f.followee_id, (followerMap.get(f.followee_id) ?? 0) + 1),
    );
    const myFollowSet = new Set((myFollows ?? []).map((f) => f.followee_id));

    setPeople(
      rows
        .map((r) => ({
          ...r,
          post_count: postMap.get(r.id) ?? 0,
          follower_count: followerMap.get(r.id) ?? 0,
          following: myFollowSet.has(r.id),
        }))
        .sort((a, b) => b.follower_count - a.follower_count),
    );
  }, [user]);

  useEffect(() => {
    Promise.all([loadTrending(), loadPeople()]).finally(() => setLoading(false));
  }, [loadTrending, loadPeople]);

  useEffect(() => {
    if (tab === 'people' && people.length === 0) loadPeople();
  }, [tab, people.length, loadPeople]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(20);
      setSearchResults((data as Profile[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggleFollow = async (id: string) => {
    if (!user) return;
    setPeople((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              following: !p.following,
              follower_count: p.following ? p.follower_count - 1 : p.follower_count + 1,
            }
          : p,
      ),
    );
    const existing = people.find((p) => p.id === id);
    if (existing?.following) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', id);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, followee_id: id });
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 md:pb-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Explore</h1>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name or username…"
          className="input !pl-11"
        />
      </div>

      {query.trim() ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Search results
          </h2>
          {searchResults.length === 0 ? (
            <p className="card px-4 py-8 text-center text-sm text-slate-500">
              No people found for “{query}”.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {searchResults.map((p) => (
                <UserCard key={p.id} profile={p} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <TabButton active={tab === 'trending'} onClick={() => setTab('trending')}>
              <TrendingUp className="h-4 w-4" /> Trending
            </TabButton>
            <TabButton active={tab === 'people'} onClick={() => setTab('people')}>
              <UserPlus className="h-4 w-4" /> People to follow
            </TabButton>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : tab === 'trending' ? (
            trending.length === 0 ? (
              <p className="card px-4 py-10 text-center text-sm text-slate-500">
                No posts to show yet.
              </p>
            ) : (
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
                {trending.map((post) => (
                  <Link key={post.id} to={`/u/${post.profiles?.username ?? ''}`}>
                    <article className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                      {post.image_url ? (
                        <img src={post.image_url} alt="" className="w-full object-cover" />
                      ) : (
                        <div className="bg-gradient-to-br from-sky-50 to-cyan-50 p-5">
                          <p className="line-clamp-6 text-[15px] leading-relaxed text-slate-700">
                            {post.content}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 p-3">
                        <img
                          src={avatarFor(post.profiles?.username ?? '', post.profiles?.avatar_url ?? null)}
                          alt=""
                          className="h-7 w-7 rounded-full bg-slate-100"
                        />
                        <span className="truncate text-sm font-medium text-slate-700">
                          @{post.profiles?.username}
                        </span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )
          ) : people.length === 0 ? (
            <p className="card px-4 py-10 text-center text-sm text-slate-500">
              No other people to show yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {people.map((p) => (
                <div key={p.id} className="card flex items-center gap-3 p-4">
                  <Link to={`/u/${p.username}`}>
                    <img
                      src={avatarFor(p.username, p.avatar_url)}
                      alt=""
                      className="h-12 w-12 rounded-full bg-slate-100"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/u/${p.username}`}
                      className="block truncate font-semibold text-slate-900 hover:underline"
                    >
                      {p.full_name ?? p.username}
                    </Link>
                    <p className="truncate text-sm text-slate-500">@{p.username}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatCount(p.follower_count)} followers · {formatCount(p.post_count)} posts
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFollow(p.id)}
                    className={p.following ? 'btn-outline !px-3 !py-1.5' : 'btn-primary !px-3 !py-1.5'}
                  >
                    {p.following ? (
                      <>
                        <Check className="h-4 w-4" /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" /> Follow
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function UserCard({ profile }: { profile: Profile }) {
  return (
    <Link to={`/u/${profile.username}`} className="card flex items-center gap-3 p-4 transition hover:shadow-md">
      <img src={avatarFor(profile.username, profile.avatar_url)} alt="" className="h-11 w-11 rounded-full bg-slate-100" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{profile.full_name ?? profile.username}</p>
        <p className="truncate text-sm text-slate-500">@{profile.username}</p>
      </div>
    </Link>
  );
}

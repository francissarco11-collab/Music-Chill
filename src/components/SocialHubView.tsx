import { useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Copy,
  Download,
  Heart,
  MessageSquare,
  Play,
  Send,
  Share2,
  Users,
} from 'lucide-react';
import { INITIAL_FRIEND_ACTIVITY } from '../data/catalog';
import type { Playlist, SharedPlaylistPost, Track } from '../types/music';
import { formatRelativeTime } from '../utils/format';
import { ArtworkImage } from './ArtworkImage';

interface SocialHubViewProps {
  posts: SharedPlaylistPost[];
  userPlaylists: Playlist[];
  allTracks: Track[];
  isSignedIn: boolean;
  onSignIn: () => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onPlayTrack: (track: Track) => void;
  onSaveToLibrary: (post: SharedPlaylistPost) => void;
  onDownloadPlaylist: (playlist: Playlist) => void;
  onLikePost: (post: SharedPlaylistPost) => void;
  onAddComment: (postId: string, text: string) => void;
  onOpenShareModal: (playlist: Playlist) => void;
  onImportByCode: (code: string) => Promise<void>;
}

export function SocialHubView({
  posts,
  userPlaylists,
  allTracks,
  isSignedIn,
  onSignIn,
  onPlayPlaylist,
  onPlayTrack,
  onSaveToLibrary,
  onDownloadPlaylist,
  onLikePost,
  onAddComment,
  onOpenShareModal,
  onImportByCode,
}: SocialHubViewProps) {
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const trackMap = new Map(allTracks.map((t) => [t.id, t]));

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);
    if (!importCode.trim()) return;
    try {
      await onImportByCode(importCode.trim());
      setImportSuccess(`Imported playlist ${importCode.trim().toUpperCase()} into your Library.`);
      setImportCode('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not find that share code.');
    }
  };

  const handleCopyCode = (postId: string, code: string) => {
    void navigator.clipboard?.writeText(code);
    setCopiedId(postId);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-8">
      {/* Header & Share/Import Bar */}
      <section className="rounded-xl border border-white/[0.08] bg-[#10141C] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#94A3B8]">
            <Users className="w-4 h-4 text-[#22C58B]" />
            <span>Social Listening Hub · Cloud-Synced Friend Mixes</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F1F5F9]">
            Share Playlists with Friends
          </h1>
          <p className="text-sm text-[#94A3B8] max-w-xl">
            Publish your own curated playlists, leave listening notes, and import mixes from friends directly into your library or Offline Vault.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <form onSubmit={handleImport} className="flex items-center gap-2">
            <input
              type="text"
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="Enter share code (e.g. SOLR-8821)"
              className="h-10 px-3.5 rounded-lg bg-[#0B0E14] border border-white/[0.1] text-sm text-[#F1F5F9] placeholder-[#64748B] font-mono uppercase focus:outline-none focus:border-[#22C58B]/70 w-52"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-[#171D28] border border-white/[0.1] text-xs font-semibold text-[#F1F5F9] hover:border-[#22C58B]/60 transition-colors whitespace-nowrap shrink-0"
            >
              Import Code
            </button>
          </form>

          {userPlaylists[0] && (
            <button
              type="button"
              onClick={() => onOpenShareModal(userPlaylists[0])}
              className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-[#22C58B] text-[#07130E] text-xs font-semibold hover:bg-[#2AD497] transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share a Playlist</span>
            </button>
          )}
        </div>
      </section>

      {!isSignedIn && (
        <div className="rounded-xl border border-white/[0.08] bg-[#121722] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[#CBD5E1]">
            Sign in with Google to publish playlists, react, and sync comments across devices in Firestore.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="px-3.5 py-2 rounded-lg bg-[#22C58B] text-[#07130E] text-xs font-semibold hover:bg-[#2AD497] whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {importError && (
        <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-2.5 text-xs text-[#FCA5A5]">
          {importError}
        </div>
      )}
      {importSuccess && (
        <div className="rounded-lg border border-[#22C58B]/30 bg-[#22C58B]/10 px-4 py-2.5 text-xs text-[#6EE7B7]">
          {importSuccess}
        </div>
      )}

      {/* Friends Live Listening Strip */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
          Friends Listening Now
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {INITIAL_FRIEND_ACTIVITY.map((friend) => {
            const track = trackMap.get(friend.currentTrackId);
            return (
              <div
                key={friend.id}
                className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ArtworkImage
                    src={friend.avatarUrl}
                    alt={friend.name}
                    className="w-11 h-11 rounded-full border border-white/[0.1] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#F1F5F9] truncate">
                      {friend.name}{' '}
                      <span className="text-xs font-normal text-[#64748B]">{friend.handle}</span>
                    </p>
                    <p className="text-xs text-[#22C58B] truncate">
                      {track ? `${track.title} · ${track.artist}` : friend.statusText}
                    </p>
                    <p className="text-[11px] text-[#64748B] truncate">
                      {friend.deviceName} · {formatRelativeTime(friend.updatedAt)}
                    </p>
                  </div>
                </div>
                {track && (
                  <button
                    type="button"
                    onClick={() => onPlayTrack(track)}
                    title={`Listen to ${track.title}`}
                    aria-label={`Listen along with ${friend.name}`}
                    className="w-9 h-9 rounded-lg bg-[#171D28] border border-white/[0.08] flex items-center justify-center text-[#F1F5F9] hover:text-[#22C58B] hover:border-[#22C58B]/50 shrink-0 transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Shared Playlists Feed */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
            Shared Community Playlists
          </h2>
          <span className="text-xs text-[#64748B] tabular-nums">{posts.length} shared mixes</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {posts.map((post) => {
            const firstTracks = post.playlist.trackIds
              .map((id) => trackMap.get(id))
              .filter((t): t is Track => Boolean(t));
            const draft = commentDrafts[post.id] || '';
            const isSaved = savedIds.has(post.id);

            return (
              <article
                key={post.id}
                className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-5 flex flex-col gap-4"
              >
                {/* Author line */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ArtworkImage
                      src={post.sharedBy.avatarUrl}
                      alt={post.sharedBy.name}
                      className="w-9 h-9 rounded-full border border-white/[0.1] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F1F5F9] truncate">
                        {post.sharedBy.name}{' '}
                        <span className="text-xs text-[#64748B] font-normal">
                          {post.sharedBy.handle} · {formatRelativeTime(post.sharedAt)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(post.id, post.shareCode)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#94A3B8] hover:text-[#22C58B] transition-colors shrink-0"
                    title="Copy share code"
                  >
                    {copiedId === post.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#22C58B]" />
                        <span className="text-[#22C58B]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{post.shareCode}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Note */}
                {post.note && (
                  <p className="text-sm text-[#CBD5E1] leading-relaxed">{post.note}</p>
                )}

                {/* Playlist Preview Row */}
                <div className="flex flex-col sm:flex-row gap-4 pt-1 border-t border-white/[0.06]">
                  <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-white/[0.08] shrink-0">
                    <ArtworkImage
                      src={post.playlist.coverUrl}
                      alt={post.playlist.name}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h3 className="font-display text-base font-semibold text-[#F1F5F9] truncate">
                        {post.playlist.name}
                      </h3>
                      <p className="text-xs text-[#94A3B8] line-clamp-2">
                        {post.playlist.description}
                      </p>
                    </div>

                    <p className="text-xs text-[#64748B] truncate">
                      Includes:{' '}
                      {firstTracks
                        .slice(0, 3)
                        .map((t) => t.title)
                        .join(', ')}
                      {firstTracks.length > 3 ? ` +${firstTracks.length - 3} more` : ''}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onPlayPlaylist(post.playlist)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C58B] text-[#07130E] text-xs font-semibold hover:bg-[#2AD497]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSaveToLibrary(post);
                          setSavedIds((prev) => new Set(prev).add(post.id));
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171D28] border border-white/[0.09] text-xs font-medium text-[#F1F5F9] hover:border-[#22C58B]/50"
                      >
                        {isSaved ? (
                          <Check className="w-3.5 h-3.5 text-[#22C58B]" />
                        ) : (
                          <BookmarkPlus className="w-3.5 h-3.5 text-[#22C58B]" />
                        )}
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDownloadPlaylist(post.playlist)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171D28] border border-white/[0.09] text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Offline</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onLikePost(post)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono tabular-nums transition-colors ml-auto ${
                          post.likedByMe
                            ? 'text-[#22C58B] bg-[#22C58B]/10'
                            : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-[#22C58B]' : ''}`} />
                        <span>{post.likes}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
                  {post.comments.length > 0 && (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {post.comments.map((cmt) => (
                        <div key={cmt.id} className="text-xs text-[#94A3B8]">
                          <span className="font-medium text-[#E2E8F0]">{cmt.authorName}</span>{' '}
                          <span className="text-[#64748B]">{cmt.authorHandle}:</span>{' '}
                          <span>{cmt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!draft.trim()) return;
                      onAddComment(post.id, draft.trim());
                      setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
                    }}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      placeholder="Leave a listening note..."
                      className="flex-1 h-8 px-2.5 rounded-md bg-[#0B0E14] border border-white/[0.07] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22C58B]/60"
                    />
                    <button
                      type="submit"
                      aria-label="Post listening note"
                      className="h-8 px-2.5 rounded-md bg-[#171D28] text-[#CBD5E1] hover:text-[#22C58B] transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

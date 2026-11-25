import { useMemo } from 'react';
import {
  Clock,
  Cloud,
  Download,
  Heart,
  LogIn,
  LogOut,
  Play,
  Share2,
} from 'lucide-react';
import type { ActivityItem, Playlist, Track } from '../types/music';
import { formatRelativeTime } from '../utils/format';
import { ArtworkImage } from './ArtworkImage';
import { TrackTable } from './TrackTable';

interface ProfileViewProps {
  displayName: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  email: string | null;
  isSignedIn: boolean;
  syncCode: string;
  activeDeviceName: string;
  totalListeningMinutes: number;
  favoriteTracks: Track[];
  recentActivity: ActivityItem[];
  allTracks: Track[];
  playlists: Playlist[];
  currentTrackId: string | null;
  isPlaying: boolean;
  favoriteIds: string[];
  offlineTrackIds: Set<string>;
  downloadingIds: Set<string>;
  offlineMode: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenSyncModal: () => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onTogglePlayPause: () => void;
  onToggleFavorite: (trackId: string) => void;
  onDownloadTrack: (track: Track) => void;
  onRemoveOfflineTrack: (trackId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
}

function getActivityLabel(item: ActivityItem, track?: Track): { title: string; verb: string } {
  if (item.type === 'played') {
    return {
      verb: 'Played',
      title: track ? `${track.title} — ${track.artist}` : 'Track playback',
    };
  }
  if (item.type === 'favorited') {
    return {
      verb: 'Favorited',
      title: track ? `${track.title} — ${track.artist}` : 'Favorite track',
    };
  }
  if (item.type === 'downloaded') {
    return {
      verb: 'Cached offline',
      title: track ? `${track.title} — ${track.artist}` : 'Offline audio',
    };
  }
  return {
    verb: 'Shared playlist',
    title: item.playlistName || 'Custom Mix',
  };
}

export function ProfileView({
  displayName,
  handle,
  avatarUrl,
  bio,
  email,
  isSignedIn,
  syncCode,
  activeDeviceName,
  totalListeningMinutes,
  favoriteTracks,
  recentActivity,
  allTracks,
  playlists,
  currentTrackId,
  isPlaying,
  favoriteIds,
  offlineTrackIds,
  downloadingIds,
  offlineMode,
  onSignIn,
  onSignOut,
  onOpenSyncModal,
  onPlayTrack,
  onTogglePlayPause,
  onToggleFavorite,
  onDownloadTrack,
  onRemoveOfflineTrack,
  onAddTrackToPlaylist,
}: ProfileViewProps) {
  const trackMap = useMemo(() => new Map(allTracks.map((t) => [t.id, t])), [allTracks]);
  const listeningHours = (totalListeningMinutes / 60).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Editorial Profile Header */}
      <section className="rounded-xl border border-white/[0.08] bg-[#10141C] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 min-w-0">
          <ArtworkImage
            src={avatarUrl}
            alt={displayName}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-white/[0.12] shrink-0"
          />
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-[#94A3B8]">
              {handle}
              {email ? ` · ${email}` : ''}
              {' · '}
              <span className="font-mono text-[#22C58B]">Sync {syncCode}</span>
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F1F5F9] truncate">
              {displayName}
            </h1>
            <p className="text-sm text-[#94A3B8] max-w-xl">{bio}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#171D28] border border-white/[0.1] text-xs font-medium text-[#F1F5F9] hover:border-[#22C58B]/60 transition-colors whitespace-nowrap shrink-0"
          >
            <Cloud className="w-3.5 h-3.5 text-[#22C58B]" />
            <span>{activeDeviceName}</span>
          </button>

          {isSignedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.1] text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22C58B] text-[#07130E] text-xs font-semibold hover:bg-[#2AD497] transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </section>

      {/* Key Profile Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 space-y-1">
          <p className="text-xs text-[#64748B]">Listening Time</p>
          <p className="font-display text-2xl font-bold text-[#F1F5F9] tabular-nums">
            {listeningHours} hrs
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 space-y-1">
          <p className="text-xs text-[#64748B]">Favorite Tracks</p>
          <p className="font-display text-2xl font-bold text-[#22C58B] tabular-nums">
            {favoriteTracks.length}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 space-y-1">
          <p className="text-xs text-[#64748B]">Offline Cached</p>
          <p className="font-display text-2xl font-bold text-[#F1F5F9] tabular-nums">
            {offlineTrackIds.size}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 space-y-1">
          <p className="text-xs text-[#64748B]">Your Playlists</p>
          <p className="font-display text-2xl font-bold text-[#F1F5F9] tabular-nums">
            {playlists.length}
          </p>
        </div>
      </div>

      {/* Main Split: Favorite Tracks + Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6 items-start">
        {/* Favorite Tracks Section */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
              Favorite Tracks
            </h2>
            <span className="text-xs text-[#64748B] tabular-nums">
              {favoriteTracks.length} saved
            </span>
          </div>

          {favoriteTracks.length === 0 ? (
            <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-8 text-center">
              <p className="text-sm font-medium text-[#E2E8F0]">No favorite tracks yet</p>
              <p className="mt-1 text-xs text-[#64748B]">
                Heart any track in Discover or the player bar to highlight it here.
              </p>
            </div>
          ) : (
            <TrackTable
              tracks={favoriteTracks}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              favoriteIds={favoriteIds}
              offlineTrackIds={offlineTrackIds}
              downloadingIds={downloadingIds}
              offlineMode={offlineMode}
              playlists={playlists}
              onPlayTrack={(track) => onPlayTrack(track, favoriteTracks)}
              onTogglePlayPause={onTogglePlayPause}
              onToggleFavorite={onToggleFavorite}
              onDownloadTrack={onDownloadTrack}
              onRemoveOfflineTrack={onRemoveOfflineTrack}
              onAddTrackToPlaylist={onAddTrackToPlaylist}
            />
          )}
        </section>

        {/* Recent Activity Timeline */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
              Recent Activity
            </h2>
            <span className="text-xs text-[#64748B] tabular-nums">
              {recentActivity.length} events
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] divide-y divide-white/[0.05]">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[#94A3B8]">No recent activity recorded yet.</p>
              </div>
            ) : (
              recentActivity.slice(0, 14).map((item) => {
                const track = item.trackId ? trackMap.get(item.trackId) : undefined;
                const { verb, title } = getActivityLabel(item, track);
                return (
                  <div
                    key={item.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#151B25] border border-white/[0.06] flex items-center justify-center shrink-0 text-[#94A3B8]">
                        {item.type === 'played' && <Clock className="w-4 h-4 text-[#22C58B]" />}
                        {item.type === 'favorited' && <Heart className="w-4 h-4 text-[#22C58B]" />}
                        {item.type === 'downloaded' && <Download className="w-4 h-4 text-[#22C58B]" />}
                        {item.type === 'shared' && <Share2 className="w-4 h-4 text-[#22C58B]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#F1F5F9] truncate">{title}</p>
                        <p className="text-[11px] text-[#64748B] truncate tabular-nums">
                          {verb} · {item.deviceName} · {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                    </div>

                    {track && (
                      <button
                        type="button"
                        onClick={() => onPlayTrack(track)}
                        aria-label={`Replay ${track.title}`}
                        className="p-2 rounded-lg text-[#94A3B8] hover:text-[#22C58B] hover:bg-white/[0.05] shrink-0 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  Check,
  Download,
  Heart,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Playlist, Track } from '../types/music';
import { formatDuration } from '../utils/format';
import { ArtworkImage } from './ArtworkImage';

interface TrackTableProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  favoriteIds: string[];
  offlineTrackIds: Set<string>;
  downloadingIds: Set<string>;
  offlineMode: boolean;
  playlists: Playlist[];
  onPlayTrack: (track: Track) => void;
  onTogglePlayPause: () => void;
  onToggleFavorite: (trackId: string) => void;
  onDownloadTrack: (track: Track) => void;
  onRemoveOfflineTrack?: (trackId: string) => void;
  onAddTrackToPlaylist?: (playlistId: string, trackId: string) => void;
  onRemoveFromCurrentPlaylist?: (trackId: string) => void;
}

export function TrackTable({
  tracks,
  currentTrackId,
  isPlaying,
  favoriteIds,
  offlineTrackIds,
  downloadingIds,
  offlineMode,
  playlists,
  onPlayTrack,
  onTogglePlayPause,
  onToggleFavorite,
  onDownloadTrack,
  onRemoveOfflineTrack,
  onAddTrackToPlaylist,
  onRemoveFromCurrentPlaylist,
}: TrackTableProps) {
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);

  if (tracks.length === 0) {
    return (
      <div className="border border-white/[0.07] rounded-xl bg-[#10141C] px-6 py-12 text-center">
        <p className="text-sm font-medium text-[#E2E8F0]">No tracks match this view</p>
        <p className="mt-1 text-xs text-[#64748B]">
          Adjust your search filter or add tracks from Discover.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/[0.07] rounded-xl bg-[#0E1219] overflow-visible">
      <div className="grid grid-cols-[40px_1fr_auto] md:grid-cols-[44px_minmax(220px,1.5fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] items-center gap-4 px-4 py-2.5 border-b border-white/[0.06] text-xs font-medium text-[#64748B]">
        <span className="text-center font-mono">#</span>
        <span>Title</span>
        <span className="hidden md:block">Album</span>
        <span className="hidden md:block">Audio</span>
        <span className="text-right pr-2">Actions · Time</span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {tracks.map((track, idx) => {
          const isCurrent = currentTrackId === track.id;
          const isFav = favoriteIds.includes(track.id);
          const isOfflineCached = offlineTrackIds.has(track.id);
          const isDownloading = downloadingIds.has(track.id);
          const unavailableOffline = offlineMode && !isOfflineCached;

          return (
            <div
              key={track.id}
              className={`group grid grid-cols-[40px_1fr_auto] md:grid-cols-[44px_minmax(220px,1.5fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] items-center gap-4 px-4 py-2.5 transition-colors ${
                isCurrent ? 'bg-[#161D28]' : 'hover:bg-white/[0.03]'
              } ${unavailableOffline ? 'opacity-50' : ''}`}
            >
              {/* Index / Play button */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  disabled={unavailableOffline}
                  onClick={() => {
                    if (isCurrent) {
                      onTogglePlayPause();
                    } else {
                      onPlayTrack(track);
                    }
                  }}
                  aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono tabular-nums text-[#94A3B8] hover:text-[#F1F5F9] disabled:cursor-not-allowed"
                >
                  {isCurrent && isPlaying ? (
                    <Pause className="w-4 h-4 text-[#22C58B]" />
                  ) : isCurrent ? (
                    <Play className="w-4 h-4 text-[#22C58B] fill-[#22C58B]" />
                  ) : (
                    <>
                      <span className="group-hover:hidden">{String(idx + 1).padStart(2, '0')}</span>
                      <Play className="w-4 h-4 hidden group-hover:block text-[#F1F5F9] fill-[#F1F5F9]" />
                    </>
                  )}
                </button>
              </div>

              {/* Cover + Title + Artist */}
              <div className="flex items-center gap-3 min-w-0">
                <ArtworkImage
                  src={track.coverUrl}
                  alt={track.album}
                  className="w-10 h-10 rounded-md shrink-0 border border-white/[0.08]"
                />
                <div className="min-w-0">
                  <button
                    type="button"
                    disabled={unavailableOffline}
                    onClick={() => (isCurrent ? onTogglePlayPause() : onPlayTrack(track))}
                    className={`block text-left text-sm font-medium truncate max-w-full ${
                      isCurrent ? 'text-[#22C58B]' : 'text-[#F1F5F9] hover:underline'
                    }`}
                  >
                    {track.title}
                  </button>
                  <p className="text-xs text-[#94A3B8] truncate">
                    {track.artist}
                    <span className="mx-1.5 text-[#475569]">·</span>
                    <span>{track.genre}</span>
                  </p>
                </div>
              </div>

              {/* Album */}
              <div className="hidden md:block text-xs text-[#94A3B8] truncate">
                {track.album}
              </div>

              {/* Clean unboxed audio metadata */}
              <div className="hidden md:flex items-center gap-1.5 text-xs text-[#64748B] truncate tabular-nums">
                <span>{track.bitDepth}</span>
                <span aria-hidden="true">·</span>
                <span>{track.sampleRate}</span>
                {isOfflineCached && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#22C58B]">Offline</span>
                  </>
                )}
              </div>

              {/* Action controls + duration */}
              <div className="flex items-center justify-end gap-1.5 shrink-0 relative">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(track.id)}
                  aria-label={isFav ? `Remove ${track.title} from favorites` : `Favorite ${track.title}`}
                  className={`p-2 rounded-lg transition-colors ${
                    isFav ? 'text-[#22C58B]' : 'text-[#64748B] hover:text-[#F1F5F9]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-[#22C58B]' : ''}`} />
                </button>

                {isOfflineCached ? (
                  <button
                    type="button"
                    onClick={() => onRemoveOfflineTrack?.(track.id)}
                    title="Cached offline (click to remove)"
                    aria-label={`Remove ${track.title} from offline cache`}
                    className="p-2 rounded-lg text-[#22C58B] hover:bg-white/[0.05] transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => onDownloadTrack(track)}
                    title={`Download lossless (${track.estimatedOfflineMb} MB)`}
                    aria-label={`Download ${track.title} offline`}
                    className="p-2 rounded-lg text-[#64748B] hover:text-[#F1F5F9] hover:bg-white/[0.05] transition-colors disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#22C58B]" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                )}

                {onAddTrackToPlaylist && playlists.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuTrackId(openMenuTrackId === track.id ? null : track.id)
                      }
                      aria-label={`Add ${track.title} to playlist`}
                      className="p-2 rounded-lg text-[#64748B] hover:text-[#F1F5F9] hover:bg-white/[0.05] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {openMenuTrackId === track.id && (
                      <div className="absolute right-0 bottom-full mb-1 z-30 w-52 rounded-lg border border-white/[0.1] bg-[#141923] shadow-xl py-1.5">
                        <p className="px-3 py-1 text-[11px] font-medium text-[#64748B]">
                          Add to playlist
                        </p>
                        {playlists.map((pl) => {
                          const alreadyIn = pl.trackIds.includes(track.id);
                          return (
                            <button
                              key={pl.id}
                              type="button"
                              onClick={() => {
                                onAddTrackToPlaylist(pl.id, track.id);
                                setOpenMenuTrackId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs text-[#E2E8F0] hover:bg-white/[0.06] flex items-center justify-between"
                            >
                              <span className="truncate">{pl.name}</span>
                              {alreadyIn && <Check className="w-3.5 h-3.5 text-[#22C58B] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {onRemoveFromCurrentPlaylist && (
                  <button
                    type="button"
                    onClick={() => onRemoveFromCurrentPlaylist(track.id)}
                    aria-label={`Remove ${track.title} from playlist`}
                    className="p-2 rounded-lg text-[#64748B] hover:text-[#F87171] hover:bg-white/[0.05] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <span className="w-11 text-right text-xs font-mono tabular-nums text-[#64748B]">
                  {formatDuration(track.durationSec)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

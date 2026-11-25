import { useMemo, useState } from 'react';
import { Download, Play, Plus, Share2, Trash2 } from 'lucide-react';
import type { Playlist, Track } from '../types/music';
import { formatDuration } from '../utils/format';
import { ArtworkImage } from './ArtworkImage';
import { TrackTable } from './TrackTable';

interface LibraryViewProps {
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  allTracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  favoriteIds: string[];
  offlineTrackIds: Set<string>;
  downloadingIds: Set<string>;
  offlineMode: boolean;
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (id: string) => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onTogglePlayPause: () => void;
  onToggleFavorite: (trackId: string) => void;
  onDownloadTrack: (track: Track) => void;
  onDownloadPlaylist: (playlist: Playlist) => void;
  onRemoveOfflineTrack: (trackId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onOpenShareModal: (playlist: Playlist) => void;
}

export function LibraryView({
  playlists,
  selectedPlaylistId,
  allTracks,
  currentTrackId,
  isPlaying,
  favoriteIds,
  offlineTrackIds,
  downloadingIds,
  offlineMode,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onPlayTrack,
  onPlayPlaylist,
  onTogglePlayPause,
  onToggleFavorite,
  onDownloadTrack,
  onDownloadPlaylist,
  onRemoveOfflineTrack,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onOpenShareModal,
}: LibraryViewProps) {
  const [showAddPicker, setShowAddPicker] = useState(false);

  const activePlaylist =
    playlists.find((p) => p.id === selectedPlaylistId) || playlists[0] || null;

  const playlistTracks = useMemo(() => {
    if (!activePlaylist) return [];
    const map = new Map(allTracks.map((t) => [t.id, t]));
    return activePlaylist.trackIds
      .map((id) => map.get(id))
      .filter((t): t is Track => Boolean(t));
  }, [activePlaylist, allTracks]);

  const availableToAdd = useMemo(() => {
    if (!activePlaylist) return [];
    const existingSet = new Set(activePlaylist.trackIds);
    return allTracks.filter((t) => !existingSet.has(t.id));
  }, [activePlaylist, allTracks]);

  const totalSec = playlistTracks.reduce((acc, t) => acc + t.durationSec, 0);
  const cachedCount = playlistTracks.filter((t) => offlineTrackIds.has(t.id)).length;

  if (!activePlaylist) {
    return (
      <div className="border border-white/[0.08] rounded-xl bg-[#10141C] p-10 text-center space-y-4">
        <h2 className="font-display text-xl font-semibold text-[#F1F5F9]">
          Your Library is empty
        </h2>
        <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
          Create your first playlist to organize tracks, cache lossless audio offline, and share with friends.
        </p>
        <button
          type="button"
          onClick={onCreatePlaylist}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#22C58B] text-[#07130E] text-sm font-semibold hover:bg-[#2AD497]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Playlist Switcher Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#10141C] border border-white/[0.07] overflow-x-auto max-w-full">
          {playlists.map((pl) => {
            const active = pl.id === activePlaylist.id;
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => onSelectPlaylist(pl.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#1D2432] text-[#F1F5F9]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {pl.name}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCreatePlaylist}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/[0.1] bg-[#131822] text-xs font-medium text-[#F1F5F9] hover:border-[#22C58B]/60 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#22C58B]" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Playlist Header */}
      <section className="rounded-xl border border-white/[0.08] bg-[#10141C] p-6 flex flex-col sm:flex-row items-start sm:items-end gap-6">
        <ArtworkImage
          src={activePlaylist.coverUrl}
          alt={activePlaylist.name}
          className="w-36 h-36 sm:w-44 sm:h-44 rounded-xl border border-white/[0.08] shrink-0"
        />

        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-xs text-[#94A3B8]">
            Playlist · {activePlaylist.ownerName}
            {activePlaylist.shareCode ? ` · Code ${activePlaylist.shareCode}` : ''}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F1F5F9] text-balance">
            {activePlaylist.name}
          </h1>
          <p className="text-sm text-[#94A3B8] max-w-2xl">
            {activePlaylist.description || 'Custom listening collection.'}
          </p>
          <p className="text-xs text-[#64748B] font-mono tabular-nums">
            {playlistTracks.length} tracks · {formatDuration(totalSec)} total · {cachedCount} cached offline
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={playlistTracks.length === 0}
              onClick={() => onPlayPlaylist(activePlaylist)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22C58B] text-[#07130E] text-sm font-semibold hover:bg-[#2AD497] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play All</span>
            </button>

            <button
              type="button"
              disabled={playlistTracks.length === 0}
              onClick={() => onDownloadPlaylist(activePlaylist)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#171D28] border border-white/[0.1] text-sm font-medium text-[#F1F5F9] hover:border-white/[0.2] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-[#22C58B]" />
              <span>Download Offline</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenShareModal(activePlaylist)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#171D28] border border-white/[0.1] text-sm font-medium text-[#F1F5F9] hover:border-[#22C58B]/50 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4 text-[#22C58B]" />
              <span>Share to Social Hub</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddPicker((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/[0.08] text-sm font-medium text-[#94A3B8] hover:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddPicker ? 'Hide Track Picker' : 'Add Tracks'}</span>
            </button>

            {playlists.length > 1 && (
              <button
                type="button"
                onClick={() => onDeletePlaylist(activePlaylist.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F87171] transition-colors whitespace-nowrap shrink-0 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Quick Add Track Drawer */}
      {showAddPicker && (
        <section className="rounded-xl border border-white/[0.08] bg-[#0E1219] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Add tracks to {activePlaylist.name}</h3>
            <span className="text-xs text-[#64748B] tabular-nums">{availableToAdd.length} available</span>
          </div>
          {availableToAdd.length === 0 ? (
            <p className="text-xs text-[#64748B]">All catalog tracks are already in this playlist.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableToAdd.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-white/[0.06] bg-[#131822]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ArtworkImage src={t.coverUrl} alt={t.title} className="w-8 h-8 rounded shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#F1F5F9] truncate">{t.title}</p>
                      <p className="text-[11px] text-[#94A3B8] truncate">{t.artist}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddTrackToPlaylist(activePlaylist.id, t.id)}
                    className="px-2.5 py-1 rounded bg-[#22C58B]/15 text-[#22C58B] text-xs font-medium hover:bg-[#22C58B]/25 shrink-0"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Playlist Tracklist */}
      <TrackTable
        tracks={playlistTracks}
        currentTrackId={currentTrackId}
        isPlaying={isPlaying}
        favoriteIds={favoriteIds}
        offlineTrackIds={offlineTrackIds}
        downloadingIds={downloadingIds}
        offlineMode={offlineMode}
        playlists={playlists}
        onPlayTrack={(track) => onPlayTrack(track, playlistTracks)}
        onTogglePlayPause={onTogglePlayPause}
        onToggleFavorite={onToggleFavorite}
        onDownloadTrack={onDownloadTrack}
        onRemoveOfflineTrack={onRemoveOfflineTrack}
        onRemoveFromCurrentPlaylist={(trackId) =>
          onRemoveTrackFromPlaylist(activePlaylist.id, trackId)
        }
      />
    </div>
  );
}

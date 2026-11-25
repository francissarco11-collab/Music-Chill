import { useMemo } from 'react';
import { Download, HardDrive, Trash2, Wifi, WifiOff } from 'lucide-react';
import type { OfflineTrackRecord, Playlist, Track } from '../types/music';
import { formatBytes } from '../utils/format';
import { TrackTable } from './TrackTable';

interface OfflineVaultViewProps {
  allTracks: Track[];
  playlists: Playlist[];
  offlineRecords: OfflineTrackRecord[];
  downloadingIds: Set<string>;
  offlineMode: boolean;
  currentTrackId: string | null;
  isPlaying: boolean;
  favoriteIds: string[];
  onToggleOfflineMode: () => void;
  onDownloadTrack: (track: Track) => void;
  onDownloadAllCatalog: () => void;
  onRemoveOfflineTrack: (trackId: string) => void;
  onClearAllOffline: () => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onTogglePlayPause: () => void;
  onToggleFavorite: (trackId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
}

export function OfflineVaultView({
  allTracks,
  playlists,
  offlineRecords,
  downloadingIds,
  offlineMode,
  currentTrackId,
  isPlaying,
  favoriteIds,
  onToggleOfflineMode,
  onDownloadTrack,
  onDownloadAllCatalog,
  onRemoveOfflineTrack,
  onClearAllOffline,
  onPlayTrack,
  onTogglePlayPause,
  onToggleFavorite,
  onAddTrackToPlaylist,
}: OfflineVaultViewProps) {
  const offlineSet = useMemo(
    () => new Set(offlineRecords.map((r) => r.trackId)),
    [offlineRecords]
  );

  const cachedTracks = useMemo(
    () => allTracks.filter((t) => offlineSet.has(t.id)),
    [allTracks, offlineSet]
  );

  const uncachedTracks = useMemo(
    () => allTracks.filter((t) => !offlineSet.has(t.id)),
    [allTracks, offlineSet]
  );

  const totalBytes = offlineRecords.reduce((acc, rec) => acc + rec.sizeBytes, 0);

  return (
    <div className="space-y-8">
      {/* Offline Vault Summary Header */}
      <section className="rounded-xl border border-white/[0.08] bg-[#10141C] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-xs font-medium text-[#94A3B8]">
            <HardDrive className="w-4 h-4 text-[#22C58B]" />
            <span>IndexedDB Lossless Audio Vault · 48 kHz Stereo WAV</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F1F5F9]">
            High-Fidelity Offline Listening
          </h1>
          <p className="text-sm text-[#94A3B8] max-w-2xl">
            Download any track or playlist directly into your browser&apos;s local IndexedDB storage for instant zero-network playback with unlimited skips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleOfflineMode}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              offlineMode
                ? 'bg-[#22C58B] text-[#07130E] border-[#22C58B]'
                : 'bg-[#171D28] text-[#F1F5F9] border-white/[0.1] hover:border-[#22C58B]/50'
            }`}
          >
            {offlineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4 text-[#22C58B]" />}
            <span>{offlineMode ? 'Offline Mode Active' : 'Switch to Offline Mode'}</span>
          </button>

          {uncachedTracks.length > 0 && (
            <button
              type="button"
              onClick={onDownloadAllCatalog}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#171D28] border border-white/[0.1] text-sm font-medium text-[#F1F5F9] hover:border-white/[0.2] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-[#22C58B]" />
              <span>Download All ({uncachedTracks.length})</span>
            </button>
          )}

          {cachedTracks.length > 0 && (
            <button
              type="button"
              onClick={onClearAllOffline}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-white/[0.08] text-xs font-medium text-[#94A3B8] hover:text-[#F87171] transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cache</span>
            </button>
          )}
        </div>
      </section>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 space-y-1">
          <p className="text-xs text-[#64748B]">Cached Tracks</p>
          <p className="font-display text-2xl font-bold text-[#F1F5F9] tabular-nums">
            {cachedTracks.length} <span className="text-sm font-normal text-[#64748B]">/ {allTracks.length}</span>
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 space-y-1">
          <p className="text-xs text-[#64748B]">Local WAV Footprint</p>
          <p className="font-display text-2xl font-bold text-[#F1F5F9] font-mono tabular-nums">
            {formatBytes(totalBytes)}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 space-y-1">
          <p className="text-xs text-[#64748B]">Playback Format</p>
          <p className="font-display text-2xl font-bold text-[#22C58B]">24-bit WAV</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 space-y-1">
          <p className="text-xs text-[#64748B]">Network State</p>
          <p className="font-display text-2xl font-bold text-[#F1F5F9]">
            {offlineMode ? 'Offline Only' : 'Hybrid Sync'}
          </p>
        </div>
      </div>

      {/* Cached Offline Tracks */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
            Downloaded for Offline Playback
          </h2>
          <span className="text-xs text-[#64748B] tabular-nums">
            {cachedTracks.length} ready
          </span>
        </div>

        {cachedTracks.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-[#0E1219] p-8 text-center space-y-3">
            <p className="text-sm font-medium text-[#E2E8F0]">No tracks cached yet</p>
            <p className="text-xs text-[#64748B]">
              Click any download icon below or download the full catalog for lossless offline playback.
            </p>
            <button
              type="button"
              onClick={onDownloadAllCatalog}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22C58B] text-[#07130E] text-xs font-semibold hover:bg-[#2AD497]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Entire Catalog</span>
            </button>
          </div>
        ) : (
          <TrackTable
            tracks={cachedTracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            favoriteIds={favoriteIds}
            offlineTrackIds={offlineSet}
            downloadingIds={downloadingIds}
            offlineMode={offlineMode}
            playlists={playlists}
            onPlayTrack={(track) => onPlayTrack(track, cachedTracks)}
            onTogglePlayPause={onTogglePlayPause}
            onToggleFavorite={onToggleFavorite}
            onDownloadTrack={onDownloadTrack}
            onRemoveOfflineTrack={onRemoveOfflineTrack}
            onAddTrackToPlaylist={onAddTrackToPlaylist}
          />
        )}
      </section>

      {/* Remaining Tracks Available to Cache */}
      {uncachedTracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
              Available to Cache
            </h2>
            <span className="text-xs text-[#64748B] tabular-nums">
              {uncachedTracks.length} tracks
            </span>
          </div>

          <TrackTable
            tracks={uncachedTracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            favoriteIds={favoriteIds}
            offlineTrackIds={offlineSet}
            downloadingIds={downloadingIds}
            offlineMode={offlineMode}
            playlists={playlists}
            onPlayTrack={(track) => onPlayTrack(track, uncachedTracks)}
            onTogglePlayPause={onTogglePlayPause}
            onToggleFavorite={onToggleFavorite}
            onDownloadTrack={onDownloadTrack}
            onAddTrackToPlaylist={onAddTrackToPlaylist}
          />
        </section>
      )}
    </div>
  );
}

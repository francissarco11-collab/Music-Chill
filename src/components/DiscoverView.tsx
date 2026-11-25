import { useMemo, useState } from 'react';
import { Download, Play, Search } from 'lucide-react';
import { CURATED_PLAYLISTS } from '../data/catalog';
import type { Playlist, Track } from '../types/music';
import { ArtworkImage } from './ArtworkImage';
import { TrackTable } from './TrackTable';

interface DiscoverViewProps {
  tracks: Track[];
  playlists: Playlist[];
  currentTrackId: string | null;
  isPlaying: boolean;
  favoriteIds: string[];
  offlineTrackIds: Set<string>;
  downloadingIds: Set<string>;
  offlineMode: boolean;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onTogglePlayPause: () => void;
  onToggleFavorite: (trackId: string) => void;
  onDownloadTrack: (track: Track) => void;
  onDownloadPlaylist: (playlist: Playlist) => void;
  onRemoveOfflineTrack: (trackId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
}

const GENRES = ['All', 'Lo-Fi Jazz', 'Ambient', 'Chillwave', 'Downtempo', 'Analog Chill'];

export function DiscoverView({
  tracks,
  playlists,
  currentTrackId,
  isPlaying,
  favoriteIds,
  offlineTrackIds,
  downloadingIds,
  offlineMode,
  onPlayTrack,
  onPlayPlaylist,
  onTogglePlayPause,
  onToggleFavorite,
  onDownloadTrack,
  onDownloadPlaylist,
  onRemoveOfflineTrack,
  onAddTrackToPlaylist,
}: DiscoverViewProps) {
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');

  const featured = CURATED_PLAYLISTS[0];

  const filteredTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracks.filter((t) => {
      const matchesGenre =
        genreFilter === 'All' ||
        t.genre.toLowerCase() === genreFilter.toLowerCase() ||
        (genreFilter === 'Lo-Fi Jazz' && t.genre === 'Jazz Hop');
      const matchesQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q);
      return matchesGenre && matchesQuery;
    });
  }, [tracks, search, genreFilter]);

  return (
    <div className="space-y-8">
      {/* Workspace Search & Segmented Genre Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks, artists, or albums..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#10141C] border border-white/[0.08] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22C58B]/70 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#10141C] border border-white/[0.07] overflow-x-auto">
          {GENRES.map((genre) => {
            const active = genreFilter === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => setGenreFilter(genre)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#1D2432] text-[#F1F5F9]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dominant Editorial Hero Anchor */}
      <section className="rounded-xl border border-white/[0.08] bg-[#10141C] overflow-hidden grid grid-cols-1 lg:grid-cols-[1.4fr_320px] items-stretch">
        <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-[#94A3B8]">
              Featured Session · 24-bit Lossless · Unlimited Skips
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F1F5F9] text-balance">
              {featured.name}
            </h1>
            <p className="text-sm text-[#94A3B8] max-w-xl leading-relaxed">
              {featured.description} Stream instantaneously across synced devices or cache the entire mix in lossless WAV for zero-network listening.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onPlayPlaylist(featured)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#22C58B] text-[#07130E] text-sm font-semibold hover:bg-[#2AD497] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Mix</span>
            </button>
            <button
              type="button"
              onClick={() => onDownloadPlaylist(featured)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#171D28] text-[#F1F5F9] border border-white/[0.1] hover:border-white/[0.2] text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Download className="w-4 h-4 text-[#22C58B]" />
              <span>Download Offline</span>
            </button>
            <span className="text-xs text-[#64748B] font-mono tabular-nums ml-1">
              {featured.trackIds.length} tracks · 48 kHz WAV ready
            </span>
          </div>
        </div>

        <div className="hidden lg:block relative min-h-[240px] border-l border-white/[0.06]">
          <ArtworkImage
            src={featured.coverUrl}
            alt={featured.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/15 to-[#10141C]/80" />
        </div>
      </section>

      {/* Curated Collections Grid */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
            Curated Chill Mixes
          </h2>
          <span className="text-xs text-[#64748B] tabular-nums">
            {CURATED_PLAYLISTS.length} collections
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {CURATED_PLAYLISTS.map((pl) => {
            const cachedCount = pl.trackIds.filter((id) => offlineTrackIds.has(id)).length;
            return (
              <div
                key={pl.id}
                className="group rounded-xl border border-white/[0.07] bg-[#0E1219] p-4 flex flex-col gap-3.5 hover:border-white/[0.15] transition-colors"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden border border-white/[0.06]">
                  <ArtworkImage src={pl.coverUrl} alt={pl.name} className="w-full h-full" />
                  <button
                    type="button"
                    onClick={() => onPlayPlaylist(pl)}
                    aria-label={`Play ${pl.name}`}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#22C58B] text-[#07130E] flex items-center justify-center shadow-lg opacity-95 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-[#2AD497]"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </div>

                <div className="space-y-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onPlayPlaylist(pl)}
                    className="block text-left font-display text-base font-semibold text-[#F1F5F9] truncate hover:text-[#22C58B] transition-colors w-full"
                  >
                    {pl.name}
                  </button>
                  <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                    {pl.description}
                  </p>
                </div>

                <div className="mt-auto pt-1 flex items-center justify-between text-xs text-[#64748B] tabular-nums">
                  <span>
                    {pl.trackIds.length} tracks · {cachedCount} offline
                  </span>
                  <button
                    type="button"
                    onClick={() => onDownloadPlaylist(pl)}
                    className="text-[#94A3B8] hover:text-[#22C58B] transition-colors font-medium"
                  >
                    {cachedCount === pl.trackIds.length ? 'Saved' : 'Save Offline'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Full High-Fidelity Catalog */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-[#F1F5F9]">
            Studio Catalog
          </h2>
          <span className="text-xs text-[#64748B] tabular-nums">
            {filteredTracks.length} tracks · Skip freely
          </span>
        </div>

        <TrackTable
          tracks={filteredTracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          favoriteIds={favoriteIds}
          offlineTrackIds={offlineTrackIds}
          downloadingIds={downloadingIds}
          offlineMode={offlineMode}
          playlists={playlists}
          onPlayTrack={(track) => onPlayTrack(track, filteredTracks)}
          onTogglePlayPause={onTogglePlayPause}
          onToggleFavorite={onToggleFavorite}
          onDownloadTrack={onDownloadTrack}
          onRemoveOfflineTrack={onRemoveOfflineTrack}
          onAddTrackToPlaylist={onAddTrackToPlaylist}
        />
      </section>
    </div>
  );
}

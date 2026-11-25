import {
  Clock,
  Disc3,
  HardDriveDownload,
  Heart,
  ListMusic,
  Plus,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import type { NavTab, OfflineTrackRecord, Playlist } from '../types/music';
import { formatBytes } from '../utils/format';

interface SidebarProps {
  activeTab: NavTab;
  selectedPlaylistId: string | null;
  playlists: Playlist[];
  favoriteCount: number;
  offlineRecords: OfflineTrackRecord[];
  totalCatalogCount: number;
  offlineMode: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectTab: (tab: NavTab) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onToggleOfflineMode: () => void;
}

export function Sidebar({
  activeTab,
  selectedPlaylistId,
  playlists,
  favoriteCount,
  offlineRecords,
  totalCatalogCount,
  offlineMode,
  mobileOpen,
  onCloseMobile,
  onSelectTab,
  onSelectPlaylist,
  onCreatePlaylist,
  onToggleOfflineMode,
}: SidebarProps) {
  const totalBytes = offlineRecords.reduce((acc, rec) => acc + rec.sizeBytes, 0);
  const pct = totalCatalogCount > 0 ? Math.min(100, Math.round((offlineRecords.length / totalCatalogCount) * 100)) : 0;

  const content = (
    <div className="flex flex-col h-full bg-[#0C0F15] border-r border-white/[0.07] w-64 select-none">
      <div className="flex items-center justify-between px-4 py-3 lg:hidden border-b border-white/[0.06]">
        <span className="font-display font-semibold text-sm text-[#F1F5F9]">Browse</span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="p-2 text-[#94A3B8] hover:text-[#F1F5F9]"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary mobile/quick links */}
      <div className="px-3 pt-4 pb-3 space-y-1">
        <p className="px-3 pb-1 text-xs font-medium text-[#64748B]">Workspace</p>
        <button
          type="button"
          onClick={() => {
            onSelectTab('discover');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'discover'
              ? 'bg-[#171D28] text-[#F1F5F9]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.03]'
          }`}
        >
          <Disc3 className={`w-4 h-4 shrink-0 ${activeTab === 'discover' ? 'text-[#22C58B]' : ''}`} />
          <span className="truncate">Discover</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTab('profile');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'profile'
              ? 'bg-[#171D28] text-[#F1F5F9]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.03]'
          }`}
        >
          <span className="flex items-center gap-3 truncate">
            <Heart className={`w-4 h-4 shrink-0 ${activeTab === 'profile' ? 'text-[#22C58B]' : ''}`} />
            <span className="truncate">Favorites &amp; Activity</span>
          </span>
          <span className="text-xs font-mono tabular-nums text-[#64748B]">{favoriteCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTab('offline');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'offline'
              ? 'bg-[#171D28] text-[#F1F5F9]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.03]'
          }`}
        >
          <span className="flex items-center gap-3 truncate">
            <HardDriveDownload className={`w-4 h-4 shrink-0 ${activeTab === 'offline' ? 'text-[#22C58B]' : ''}`} />
            <span className="truncate">Offline Vault</span>
          </span>
          <span className="text-xs font-mono tabular-nums text-[#64748B]">{offlineRecords.length}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTab('social');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'social'
              ? 'bg-[#171D28] text-[#F1F5F9]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.03]'
          }`}
        >
          <Users className={`w-4 h-4 shrink-0 ${activeTab === 'social' ? 'text-[#22C58B]' : ''}`} />
          <span className="truncate">Social Hub</span>
        </button>
      </div>

      <div className="mx-4 border-t border-white/[0.06]" />

      {/* Playlists Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-xs font-medium text-[#64748B]">Your Playlists</span>
          <button
            type="button"
            onClick={onCreatePlaylist}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#94A3B8] hover:text-[#22C58B] transition-colors py-1 px-1.5 rounded"
            title="Create playlist"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="space-y-0.5">
          {playlists.map((pl) => {
            const isSelected = activeTab === 'library' && selectedPlaylistId === pl.id;
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => {
                  onSelectPlaylist(pl.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-[#171D28] text-[#F1F5F9] font-medium'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.03]'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <ListMusic className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#22C58B]' : 'text-[#64748B]'}`} />
                  <span className="truncate">{pl.name}</span>
                </span>
                <span className="text-xs font-mono tabular-nums text-[#64748B] shrink-0 ml-2">
                  {pl.trackIds.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Offline Listening Control Footer */}
      <div className="p-4 border-t border-white/[0.07] bg-[#0A0D12] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className={`w-4 h-4 ${offlineMode ? 'text-[#22C58B]' : 'text-[#64748B]'}`} />
            <span className="text-xs font-medium text-[#E2E8F0]">Offline Mode</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={offlineMode}
            onClick={onToggleOfflineMode}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ${
              offlineMode
                ? 'bg-[#22C58B] border-[#22C58B]'
                : 'bg-[#1B222E] border-white/[0.12]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                offlineMode ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] tabular-nums">
            <span>{offlineRecords.length} of {totalCatalogCount} cached</span>
            <span className="font-mono">{formatBytes(totalBytes)}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#181E29] overflow-hidden">
            <div
              className="h-full bg-[#22C58B] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
          <Clock className="w-3 h-3 shrink-0" />
          <span>Unlimited skips · 24-bit WAV cache</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-full">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}

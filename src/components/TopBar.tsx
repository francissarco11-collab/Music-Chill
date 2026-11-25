import { Cloud, Menu } from 'lucide-react';
import type { NavTab } from '../types/music';

interface TopBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSyncModal: () => void;
  onToggleMobileMenu: () => void;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string }> = [
  { id: 'discover', label: 'Discover' },
  { id: 'library', label: 'Library' },
  { id: 'offline', label: 'Offline' },
  { id: 'social', label: 'Social Hub' },
  { id: 'profile', label: 'Profile' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onOpenSyncModal,
  onToggleMobileMenu,
}: TopBarProps) {
  return (
    <header className="h-16 shrink-0 border-b border-white/[0.07] bg-[#0B0E13] px-4 lg:px-6 flex items-center justify-between gap-8">
      {/* Zone 1: Single-line Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.05] transition-colors"
          aria-label="Toggle sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('discover')}
          className="font-display text-lg font-bold tracking-tight text-[#F1F5F9] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22C58B]"
        >
          Music chill
        </button>
      </div>

      {/* Zone 2: Clean single-line text nav links */}
      <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative py-5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22C58B] ${
                isActive
                  ? 'text-[#F1F5F9]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#22C58B]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary action button */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenSyncModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#18202C] text-[#F1F5F9] border border-white/[0.1] hover:border-[#22C58B]/60 hover:bg-[#1E2837] transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C58B]"
        >
          <Cloud className="w-3.5 h-3.5 text-[#22C58B]" />
          <span>Cloud Sync</span>
        </button>
      </div>
    </header>
  );
}

import { Play, X } from 'lucide-react';
import type { Track } from '../types/music';
import { formatDuration } from '../utils/format';
import { ArtworkImage } from './ArtworkImage';

interface QueueDrawerProps {
  open: boolean;
  queue: Track[];
  currentTrackId: string | null;
  onClose: () => void;
  onPlayFromQueue: (track: Track) => void;
}

export function QueueDrawer({
  open,
  queue,
  currentTrackId,
  onClose,
  onPlayFromQueue,
}: QueueDrawerProps) {
  if (!open) return null;

  return (
    <aside className="fixed right-0 top-16 bottom-20 w-80 z-30 border-l border-white/[0.08] bg-[#0C0F15] shadow-2xl flex flex-col">
      <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold text-[#F1F5F9]">Playback Queue</h2>
          <p className="text-[11px] text-[#64748B] tabular-nums">
            {queue.length} tracks · Unlimited skips
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close queue"
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.05]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {queue.map((track, idx) => {
          const active = track.id === currentTrackId;
          return (
            <button
              key={`${track.id}-${idx}`}
              type="button"
              onClick={() => onPlayFromQueue(track)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${
                active ? 'bg-[#171D28]' : 'hover:bg-white/[0.04]'
              }`}
            >
              <ArtworkImage
                src={track.coverUrl}
                alt={track.title}
                className="w-9 h-9 rounded shrink-0 border border-white/[0.06]"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-medium truncate ${
                    active ? 'text-[#22C58B]' : 'text-[#F1F5F9]'
                  }`}
                >
                  {track.title}
                </p>
                <p className="text-[11px] text-[#94A3B8] truncate">{track.artist}</p>
              </div>
              {active ? (
                <Play className="w-3.5 h-3.5 text-[#22C58B] fill-[#22C58B] shrink-0" />
              ) : (
                <span className="text-[11px] font-mono tabular-nums text-[#64748B] shrink-0">
                  {formatDuration(track.durationSec)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

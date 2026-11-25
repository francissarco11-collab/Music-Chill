import { useEffect, useRef } from 'react';
import {
  Check,
  Download,
  Heart,
  Laptop,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { chillAudioPlayer } from '../audio/synthEngine';
import type { AudioFidelity, Track } from '../types/music';
import { formatDuration } from '../utils/format';
import { ArtworkImage } from './ArtworkImage';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  positionSec: number;
  volume: number;
  shuffle: boolean;
  repeatOne: boolean;
  fidelity: AudioFidelity;
  isFavorite: boolean;
  isOfflineCached: boolean;
  isDownloading: boolean;
  activeDeviceName: string;
  queueOpen: boolean;
  onTogglePlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onSeek: (sec: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleFidelity: () => void;
  onToggleFavorite: () => void;
  onDownloadCurrent: () => void;
  onOpenDeviceSync: () => void;
  onToggleQueue: () => void;
}

export function PlayerBar({
  currentTrack,
  isPlaying,
  positionSec,
  volume,
  shuffle,
  repeatOne,
  fidelity,
  isFavorite,
  isOfflineCached,
  isDownloading,
  activeDeviceName,
  queueOpen,
  onTogglePlayPause,
  onPrevTrack,
  onNextTrack,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleFidelity,
  onToggleFavorite,
  onDownloadCurrent,
  onOpenDeviceSync,
  onToggleQueue,
}: PlayerBarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    const freqData = new Uint8Array(new ArrayBuffer(32));

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          const hasData = isPlaying && chillAudioPlayer.getFrequencyData(freqData);
          const bars = 16;
          const gap = 2;
          const barW = Math.floor((w - gap * (bars - 1)) / bars);

          for (let i = 0; i < bars; i++) {
            const val = hasData ? freqData[i % freqData.length] / 255 : 0.08;
            const barH = Math.max(2, Math.round(val * h));
            ctx.fillStyle = isPlaying ? 'rgba(34, 197, 139, 0.72)' : 'rgba(148, 163, 184, 0.25)';
            ctx.fillRect(i * (barW + gap), h - barH, barW, barH);
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  if (!currentTrack) return null;

  const progressPct =
    currentTrack.durationSec > 0
      ? Math.min(100, (positionSec / currentTrack.durationSec) * 100)
      : 0;

  return (
    <footer className="shrink-0 h-20 border-t border-white/[0.08] bg-[#0B0E14] px-3 sm:px-5 flex items-center justify-between gap-4 z-40">
      {/* Left: Active Track Metadata */}
      <div className="flex items-center gap-3 min-w-0 w-[30%] max-w-[320px]">
        <ArtworkImage
          src={currentTrack.coverUrl}
          alt={currentTrack.album}
          className="w-12 h-12 rounded-lg border border-white/[0.08] shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#F1F5F9] truncate">{currentTrack.title}</p>
          <p className="text-xs text-[#94A3B8] truncate">
            {currentTrack.artist}
            <span className="hidden sm:inline text-[#64748B]">
              {' '}
              · {isOfflineCached ? 'Offline Ready' : 'Cloud Stream'}
            </span>
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1 shrink-0 ml-1">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Remove favorite' : 'Favorite track'}
            className={`p-2 rounded-lg transition-colors ${
              isFavorite ? 'text-[#22C58B]' : 'text-[#64748B] hover:text-[#F1F5F9]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#22C58B]' : ''}`} />
          </button>

          <button
            type="button"
            disabled={isOfflineCached || isDownloading}
            onClick={onDownloadCurrent}
            title={isOfflineCached ? 'Saved in Offline Vault' : 'Save track offline'}
            aria-label={isOfflineCached ? 'Track cached offline' : 'Download track offline'}
            className={`p-2 rounded-lg transition-colors ${
              isOfflineCached ? 'text-[#22C58B]' : 'text-[#64748B] hover:text-[#F1F5F9]'
            }`}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#22C58B]" />
            ) : isOfflineCached ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Center: Transport & Unlimited Skips + Seek Bar */}
      <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Toggle shuffle"
            className={`hidden sm:inline-flex p-1.5 rounded transition-colors ${
              shuffle ? 'text-[#22C58B]' : 'text-[#64748B] hover:text-[#F1F5F9]'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrevTrack}
            aria-label="Previous track"
            title="Previous track (unlimited)"
            className="p-1.5 rounded text-[#CBD5E1] hover:text-[#F1F5F9] transition-colors"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-9 h-9 rounded-full bg-[#22C58B] text-[#07130E] hover:bg-[#2AD497] flex items-center justify-center transition-transform active:scale-95 shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNextTrack}
            aria-label="Skip to next track"
            title="Unlimited skips enabled"
            className="p-1.5 rounded text-[#CBD5E1] hover:text-[#F1F5F9] transition-colors"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={onToggleRepeat}
            aria-label="Toggle repeat track"
            className={`hidden sm:inline-flex p-1.5 rounded transition-colors ${
              repeatOne ? 'text-[#22C58B]' : 'text-[#64748B] hover:text-[#F1F5F9]'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex items-center gap-2.5">
          <span className="text-[11px] font-mono tabular-nums text-[#64748B] w-9 text-right">
            {formatDuration(positionSec)}
          </span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={currentTrack.durationSec}
              value={Math.min(positionSec, currentTrack.durationSec)}
              onChange={(e) => onSeek(Number(e.target.value))}
              aria-label="Seek playback position"
              className="chill-slider w-full"
              style={{
                background: `linear-gradient(to right, #22C58B ${progressPct}%, rgba(255,255,255,0.12) ${progressPct}%)`,
                height: '4px',
                borderRadius: '9999px',
              }}
            />
          </div>
          <span className="text-[11px] font-mono tabular-nums text-[#64748B] w-9">
            {formatDuration(currentTrack.durationSec)}
          </span>
        </div>
      </div>

      {/* Right: Spectrum, Lossless Quality, Device Handoff, Queue, Volume */}
      <div className="hidden md:flex items-center justify-end gap-3 w-[30%] max-w-[340px]">
        <canvas
          ref={canvasRef}
          width={64}
          height={20}
          className="hidden xl:block shrink-0"
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={onToggleFidelity}
          title="Switch audio fidelity"
          className="text-xs font-mono text-[#94A3B8] hover:text-[#F1F5F9] px-2 py-1 rounded border border-white/[0.08] bg-[#131822] whitespace-nowrap shrink-0 transition-colors"
        >
          {fidelity === 'lossless' ? '24-bit Lossless' : '320k High'}
        </button>

        <button
          type="button"
          onClick={onOpenDeviceSync}
          title={`Playing on ${activeDeviceName}`}
          aria-label="Transfer playback device"
          className="p-2 rounded-lg text-[#94A3B8] hover:text-[#22C58B] hover:bg-white/[0.04] transition-colors"
        >
          <Laptop className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleQueue}
          aria-label="Toggle playback queue"
          className={`p-2 rounded-lg transition-colors ${
            queueOpen ? 'text-[#22C58B] bg-white/[0.06]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 w-24">
          <button
            type="button"
            onClick={() => onVolumeChange(volume > 0 ? 0 : 0.78)}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            className="text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            className="chill-slider w-full"
            style={{
              background: `linear-gradient(to right, #94A3B8 ${volume * 100}%, rgba(255,255,255,0.12) ${volume * 100}%)`,
              height: '4px',
              borderRadius: '9999px',
            }}
          />
        </div>
      </div>
    </footer>
  );
}

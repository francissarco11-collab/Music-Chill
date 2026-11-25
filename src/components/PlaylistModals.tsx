import { useState } from 'react';
import { Share2, X } from 'lucide-react';
import { COVER_ART } from '../data/catalog';
import type { Playlist } from '../types/music';
import { ArtworkImage } from './ArtworkImage';

interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, coverUrl: string) => void;
}

const COVER_OPTIONS = [
  { label: 'Midnight Vinyl', url: COVER_ART.midnightVinyl },
  { label: 'Nordic Drift', url: COVER_ART.nordicDrift },
  { label: 'Velvet Espresso', url: COVER_ART.velvetEspresso },
  { label: 'Solar Echo', url: COVER_ART.solarEcho },
  { label: 'Rain Studio', url: COVER_ART.rainStudio },
];

export function CreatePlaylistModal({ open, onClose, onCreate }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState(COVER_ART.midnightVinyl);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim(), coverUrl);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-xl border border-white/[0.1] bg-[#0F131B] shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[#F1F5F9]">New Playlist</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new playlist modal"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#94A3B8]">Playlist Name</label>
            <input
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Late Night Coding"
              className="w-full h-10 px-3 rounded-lg bg-[#0A0D12] border border-white/[0.1] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22C58B]/70"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#94A3B8]">Description</label>
            <textarea
              rows={2}
              maxLength={240}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mood, tempo, or listening notes..."
              className="w-full p-3 rounded-lg bg-[#0A0D12] border border-white/[0.1] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22C58B]/70 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#94A3B8]">Cover Artwork</label>
            <div className="grid grid-cols-5 gap-2">
              {COVER_OPTIONS.map((opt) => (
                <button
                  key={opt.url}
                  type="button"
                  onClick={() => setCoverUrl(opt.url)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    coverUrl === opt.url ? 'border-[#22C58B]' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <ArtworkImage src={opt.url} alt={opt.label} className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#22C58B] text-[#07130E] text-xs font-semibold hover:bg-[#2AD497]"
            >
              Create Playlist
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

interface SharePlaylistModalProps {
  playlist: Playlist | null;
  allPlaylists: Playlist[];
  onClose: () => void;
  onShare: (playlist: Playlist, note: string) => Promise<void>;
}

export function SharePlaylistModal({
  playlist,
  allPlaylists,
  onClose,
  onShare,
}: SharePlaylistModalProps) {
  const [selectedId, setSelectedId] = useState(playlist?.id || allPlaylists[0]?.id || '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!playlist) return null;

  const target = allPlaylists.find((p) => p.id === selectedId) || playlist;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onShare(target, note.trim() || `Sharing ${target.name} with the Music chill community.`);
      setNote('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-xl border border-white/[0.1] bg-[#0F131B] shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#22C58B]" />
            <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
              Share to Social Hub
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#94A3B8]">Choose Playlist</label>
            <select
              value={target.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#0A0D12] border border-white/[0.1] text-sm text-[#F1F5F9] focus:outline-none focus:border-[#22C58B]/70"
            >
              {allPlaylists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.trackIds.length} tracks)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#94A3B8]">Note for Friends</label>
            <textarea
              rows={3}
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell friends why this mix fits the moment..."
              className="w-full p-3 rounded-lg bg-[#0A0D12] border border-white/[0.1] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22C58B]/70 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#22C58B] text-[#07130E] text-xs font-semibold hover:bg-[#2AD497] disabled:opacity-60"
            >
              {submitting ? 'Sharing...' : 'Publish & Get Code'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

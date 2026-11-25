import { useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Laptop,
  LogIn,
  LogOut,
  RefreshCw,
  Smartphone,
  Speaker,
  X,
} from 'lucide-react';
import type { DeviceSession, Track } from '../types/music';
import { formatDuration, formatRelativeTime } from '../utils/format';

interface CloudSyncModalProps {
  open: boolean;
  isSignedIn: boolean;
  userEmail: string | null;
  syncCode: string;
  lastSyncedAt: string;
  devices: DeviceSession[];
  activeDeviceId: string;
  currentTrack: Track | null;
  positionSec: number;
  isSyncing: boolean;
  onClose: () => void;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  onSwitchSyncCode: (newCode: string) => Promise<void>;
  onTransferDevice: (device: DeviceSession) => Promise<void>;
  onSyncNow: () => Promise<void>;
}

export function CloudSyncModal({
  open,
  isSignedIn,
  userEmail,
  syncCode,
  lastSyncedAt,
  devices,
  activeDeviceId,
  currentTrack,
  positionSec,
  isSyncing,
  onClose,
  onSignInGoogle,
  onSignOutGoogle,
  onSwitchSyncCode,
  onTransferDevice,
  onSyncNow,
}: CloudSyncModalProps) {
  const [codeInput, setCodeInput] = useState(syncCode);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCopy = () => {
    void navigator.clipboard?.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!codeInput.trim()) return;
    try {
      await onSwitchSyncCode(codeInput.trim().toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch sync code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-white/[0.1] bg-[#0F131B] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-[#22C58B]" />
            <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
              Cloud Sync &amp; Devices
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cloud sync modal"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Firebase Google Account Sync */}
          <div className="rounded-lg border border-white/[0.07] bg-[#141924] p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#F1F5F9]">
                {isSignedIn ? 'Firebase Cloud Account Connected' : 'Sign in for Personal Cloud Sync'}
              </p>
              <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                {isSignedIn
                  ? `${userEmail || 'Verified Google Account'} · Firestore real-time sync active`
                  : 'Connect Google to persist playlists, favorites, and playback across sessions.'}
              </p>
            </div>
            {isSignedIn ? (
              <button
                type="button"
                onClick={onSignOutGoogle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] text-xs font-medium text-[#CBD5E1] hover:text-[#F1F5F9] shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignInGoogle}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#22C58B] text-[#07130E] text-xs font-semibold hover:bg-[#2AD497] shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          {/* Sync Code Linking */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#94A3B8]">Cross-Device Sync Code</span>
              <span className="text-[11px] text-[#64748B] tabular-nums">
                Synced {formatRelativeTime(lastSyncedAt)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-10 px-3 rounded-lg bg-[#0A0D12] border border-white/[0.08] flex items-center justify-between">
                <span className="font-mono text-sm font-semibold tracking-wider text-[#22C58B]">
                  {syncCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#F1F5F9]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#22C58B]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => void onSyncNow()}
                className="h-10 px-3.5 rounded-lg bg-[#171D28] border border-white/[0.1] text-xs font-medium text-[#F1F5F9] hover:border-[#22C58B]/60 inline-flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#22C58B]' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>

            <form onSubmit={handleJoinCode} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Link another Sync Code..."
                className="flex-1 h-9 px-3 rounded-lg bg-[#0A0D12] border border-white/[0.08] text-xs font-mono uppercase text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22C58B]/60"
              />
              <button
                type="submit"
                className="h-9 px-3.5 rounded-lg border border-white/[0.1] text-xs font-medium text-[#CBD5E1] hover:text-[#F1F5F9]"
              >
                Link Device Code
              </button>
            </form>
            {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
          </div>

          {/* Device Handoff List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#94A3B8]">Available Playback Devices</span>
              {currentTrack && (
                <span className="text-[11px] text-[#64748B] font-mono tabular-nums truncate max-w-[220px]">
                  {currentTrack.title} · {formatDuration(positionSec)}
                </span>
              )}
            </div>

            <div className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-[#0B0E14]">
              {devices.map((device) => {
                const isActive = device.id === activeDeviceId;
                return (
                  <div
                    key={device.id}
                    className="px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#151B25] flex items-center justify-center text-[#94A3B8] shrink-0">
                        {device.platform === 'Desktop' && <Laptop className="w-4 h-4" />}
                        {device.platform === 'Mobile' && <Smartphone className="w-4 h-4" />}
                        {device.platform === 'Hi-Fi DAC' && <Speaker className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#F1F5F9] truncate">
                          {device.name}
                        </p>
                        <p className="text-[11px] text-[#64748B] tabular-nums">
                          {device.platform} · Active {formatRelativeTime(device.lastActiveAt)}
                        </p>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="text-xs font-medium text-[#22C58B] shrink-0">
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onTransferDevice(device)}
                        className="px-3 py-1.5 rounded-lg bg-[#171D28] border border-white/[0.09] text-xs font-medium text-[#F1F5F9] hover:border-[#22C58B]/60 shrink-0"
                      >
                        Transfer Here
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

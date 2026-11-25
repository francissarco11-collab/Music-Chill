import type { CloudProfile, Playlist, SharedPlaylistPost } from '../types/music';

const PROFILE_STORAGE_PREFIX = 'music-chill-profile-v1:';
const SYNC_CODE_STORAGE_KEY = 'music-chill-active-sync-code';

export function getStoredSyncCode(): string {
  try {
    return localStorage.getItem(SYNC_CODE_STORAGE_KEY) || 'CHILL-7429';
  } catch {
    return 'CHILL-7429';
  }
}

export function setStoredSyncCode(syncCode: string): void {
  try {
    localStorage.setItem(SYNC_CODE_STORAGE_KEY, syncCode);
  } catch {
    // ignore storage failures
  }
}

export function saveLocalProfileCache(profile: CloudProfile): void {
  try {
    localStorage.setItem(`${PROFILE_STORAGE_PREFIX}${profile.syncCode}`, JSON.stringify(profile));
  } catch {
    // ignore quota errors
  }
}

export function loadLocalProfileCache(syncCode: string): CloudProfile | null {
  try {
    const raw = localStorage.getItem(`${PROFILE_STORAGE_PREFIX}${syncCode}`);
    return raw ? (JSON.parse(raw) as CloudProfile) : null;
  } catch {
    return null;
  }
}

export async function fetchCloudProfile(syncCode: string): Promise<CloudProfile> {
  const res = await fetch(`/api/sync/${encodeURIComponent(syncCode)}`);
  if (!res.ok) {
    throw new Error(`Sync fetch failed (${res.status})`);
  }
  const data = (await res.json()) as CloudProfile;
  saveLocalProfileCache(data);
  return data;
}

export async function pushCloudProfile(profile: CloudProfile): Promise<CloudProfile> {
  saveLocalProfileCache(profile);
  const res = await fetch(`/api/sync/${encodeURIComponent(profile.syncCode)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    throw new Error(`Sync update failed (${res.status})`);
  }
  const updated = (await res.json()) as CloudProfile;
  saveLocalProfileCache(updated);
  return updated;
}

export async function transferPlaybackDevice(
  syncCode: string,
  payload: {
    deviceId: string;
    currentTrackId: string;
    positionSec: number;
    isPlaying: boolean;
  }
): Promise<CloudProfile> {
  const res = await fetch(`/api/sync/${encodeURIComponent(syncCode)}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Device transfer failed (${res.status})`);
  }
  const updated = (await res.json()) as CloudProfile;
  saveLocalProfileCache(updated);
  return updated;
}

export function subscribeProfileStream(
  syncCode: string,
  onSync: (profile: CloudProfile) => void
): () => void {
  const es = new EventSource(`/api/sync/${encodeURIComponent(syncCode)}/stream`);
  es.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as { type: string; profile?: CloudProfile };
      if (parsed.type === 'profile_sync' && parsed.profile) {
        saveLocalProfileCache(parsed.profile);
        onSync(parsed.profile);
      }
    } catch {
      // ignore heartbeat parse
    }
  };
  return () => {
    es.close();
  };
}

export async function fetchSocialHub(): Promise<SharedPlaylistPost[]> {
  const res = await fetch('/api/social/hub');
  if (!res.ok) {
    throw new Error('Failed to load social hub');
  }
  const data = (await res.json()) as { posts: SharedPlaylistPost[] };
  return data.posts || [];
}

export async function sharePlaylistToHub(payload: {
  playlist: Playlist;
  note: string;
  sharedBy: { name: string; handle: string; avatarUrl: string };
}): Promise<SharedPlaylistPost> {
  const res = await fetch('/api/social/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to share playlist');
  }
  return (await res.json()) as SharedPlaylistPost;
}

export async function reactToSharedPlaylist(shareId: string, delta: 1 | -1): Promise<SharedPlaylistPost> {
  const res = await fetch(`/api/social/like/${encodeURIComponent(shareId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  if (!res.ok) {
    throw new Error('Failed to react to shared playlist');
  }
  return (await res.json()) as SharedPlaylistPost;
}

export async function recordSharedPlaylistSave(shareId: string): Promise<SharedPlaylistPost> {
  const res = await fetch(`/api/social/save/${encodeURIComponent(shareId)}`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to record playlist save');
  }
  return (await res.json()) as SharedPlaylistPost;
}

export async function commentOnSharedPlaylist(
  shareId: string,
  payload: { authorName: string; authorHandle: string; text: string }
): Promise<SharedPlaylistPost> {
  const res = await fetch(`/api/social/comment/${encodeURIComponent(shareId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to post note');
  }
  return (await res.json()) as SharedPlaylistPost;
}

export async function importPlaylistByShareCode(shareCode: string): Promise<SharedPlaylistPost> {
  const res = await fetch(`/api/social/import/${encodeURIComponent(shareCode.trim())}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'Share code not found');
  }
  return (await res.json()) as SharedPlaylistPost;
}

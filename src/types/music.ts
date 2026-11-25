export type AudioFidelity = 'lossless' | 'high';

export type NavTab = 'discover' | 'library' | 'offline' | 'social' | 'profile';

export type MusicalScale = 'major7' | 'minor9' | 'dorian' | 'lydian' | 'pentatonic';

export type TextureStyle = 'vinyl' | 'rain' | 'tape' | 'air';

export interface TrackSynthSpec {
  bpm: number;
  rootMidi: number;
  scale: MusicalScale;
  chords: number[][];
  padWarmth: number;
  grooveDensity: 'sparse' | 'steady' | 'swing';
  texture: TextureStyle;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  durationSec: number;
  coverUrl: string;
  releaseYear: number;
  sampleRate: string;
  bitDepth: string;
  estimatedOfflineMb: number;
  synth: TrackSynthSpec;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  ownerName: string;
  ownerHandle: string;
  trackIds: string[];
  isPublic: boolean;
  shareCode?: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'played' | 'favorited' | 'downloaded' | 'shared';
  trackId?: string;
  playlistId?: string;
  playlistName?: string;
  deviceName: string;
  timestamp: string;
}

export interface DeviceSession {
  id: string;
  name: string;
  platform: 'Desktop' | 'Mobile' | 'Hi-Fi DAC';
  lastActiveAt: string;
  isCurrent?: boolean;
}

export interface PlaybackSyncState {
  currentTrackId: string;
  positionSec: number;
  isPlaying: boolean;
  activeDeviceId: string;
  fidelity: AudioFidelity;
  queueTrackIds: string[];
  updatedAt: string;
}

export interface CloudProfile {
  syncCode: string;
  displayName: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  favoriteTrackIds: string[];
  playlists: Playlist[];
  recentActivity: ActivityItem[];
  devices: DeviceSession[];
  playback: PlaybackSyncState;
  totalListeningMinutes: number;
  lastSyncedAt: string;
}

export interface SharedComment {
  id: string;
  authorName: string;
  authorHandle: string;
  text: string;
  createdAt: string;
}

export interface SharedPlaylistPost {
  id: string;
  shareCode: string;
  playlist: Playlist;
  note: string;
  sharedBy: {
    name: string;
    handle: string;
    avatarUrl: string;
  };
  likes: number;
  likedByMe?: boolean;
  savesCount: number;
  comments: SharedComment[];
  sharedAt: string;
}

export interface FriendActivity {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  currentTrackId: string;
  deviceName: string;
  statusText: string;
  updatedAt: string;
}

export interface OfflineTrackRecord {
  trackId: string;
  sizeBytes: number;
  downloadedAt: string;
  sampleRate: string;
  bitDepth: string;
}

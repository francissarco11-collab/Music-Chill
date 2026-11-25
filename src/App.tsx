import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  clearAllOfflineTracks,
  getAllOfflineRecords,
  removeOfflineTrack,
  saveOfflineTrack,
} from './audio/offlineDb';
import { chillAudioPlayer, renderTrackToOfflineWav } from './audio/synthEngine';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DiscoverView } from './components/DiscoverView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LibraryView } from './components/LibraryView';
import { OfflineVaultView } from './components/OfflineVaultView';
import { PlayerBar } from './components/PlayerBar';
import { CreatePlaylistModal, SharePlaylistModal } from './components/PlaylistModals';
import { ProfileView } from './components/ProfileView';
import { QueueDrawer } from './components/QueueDrawer';
import { Sidebar } from './components/Sidebar';
import { SocialHubView } from './components/SocialHubView';
import { TopBar } from './components/TopBar';
import {
  CATALOG_TRACKS,
  COVER_ART,
  INITIAL_SHARED_POSTS,
} from './data/catalog';
import { auth, googleProvider } from './firebase';
import {
  addCommentToSharedPostInFirestore,
  createPlaylistInFirestore,
  deletePlaylistInFirestore,
  ensureUserProvisionedInFirestore,
  importSharedPostByCodeFromFirestore,
  logActivityInFirestore,
  publishSharedPostInFirestore,
  subscribeCloudSyncState,
  subscribeSocialPosts,
  subscribeUserActivity,
  subscribeUserPlaylists,
  subscribeUserProfile,
  toggleLikeSharedPostInFirestore,
  transferDeviceInFirestore,
  updateFavoritesInFirestore,
  updateFidelityInFirestore,
  updatePlaybackSyncInFirestore,
  updatePlaylistTracksInFirestore,
} from './services/firebaseSync';
import {
  commentOnSharedPlaylist,
  fetchCloudProfile,
  fetchSocialHub,
  getStoredSyncCode,
  importPlaylistByShareCode,
  loadLocalProfileCache,
  pushCloudProfile,
  reactToSharedPlaylist,
  recordSharedPlaylistSave,
  setStoredSyncCode,
  sharePlaylistToHub,
  subscribeProfileStream,
  transferPlaybackDevice,
} from './services/syncClient';
import type {
  ActivityItem,
  AudioFidelity,
  CloudProfile,
  DeviceSession,
  NavTab,
  OfflineTrackRecord,
  Playlist,
  SharedPlaylistPost,
  Track,
} from './types/music';

const DEFAULT_DEVICES: DeviceSession[] = [
  { id: 'dev-desktop', name: 'Desktop Web Studio', platform: 'Desktop', lastActiveAt: new Date().toISOString() },
  { id: 'dev-mobile', name: 'Pixel 9 Pro', platform: 'Mobile', lastActiveAt: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: 'dev-hifi', name: 'Living Room DAC', platform: 'Hi-Fi DAC', lastActiveAt: new Date(Date.now() - 120 * 60000).toISOString() },
];

const INITIAL_GUEST_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-my-focus',
    name: 'Deep Studio Focus',
    description: 'Zero distractions, warm analog Rhodes and gentle rain textures.',
    coverUrl: COVER_ART.midnightVinyl,
    ownerName: 'Maya Lin',
    ownerHandle: '@mayachill',
    trackIds: ['trk-01', 'trk-02', 'trk-03', 'trk-09', 'trk-11'],
    isPublic: true,
    shareCode: 'MAYA-7429',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pl-sunday-coffee',
    name: 'Sunday Pour Over',
    description: 'Laid-back jazz hop and acoustic warmth for slow mornings.',
    coverUrl: COVER_ART.velvetEspresso,
    ownerName: 'Maya Lin',
    ownerHandle: '@mayachill',
    trackIds: ['trk-05', 'trk-06', 'trk-07', 'trk-08'],
    isPublic: false,
    updatedAt: new Date().toISOString(),
  },
];

function MusicChillShell() {
  const [activeTab, setActiveTab] = useState<NavTab>('discover');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Profile & Library state (hydrates from Firestore if signed in, else Express Cloud Sync + local cache)
  const [syncCode, setSyncCode] = useState<string>(() => getStoredSyncCode());
  const [displayName, setDisplayName] = useState('Maya Lin');
  const [handle, setHandle] = useState('@mayachill');
  const [avatarUrl, setAvatarUrl] = useState(COVER_ART.userAvatar);
  const [bio, setBio] = useState(
    'Curating late-night lo-fi vinyl, Nordic ambient textures, and lossless focus sessions.'
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(['trk-01', 'trk-03', 'trk-05', 'trk-09']);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_GUEST_PLAYLISTS);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>('pl-my-focus');
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    {
      id: 'act-init-1',
      type: 'played',
      trackId: 'trk-01',
      deviceName: 'Desktop Web Studio',
      timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    },
    {
      id: 'act-init-2',
      type: 'favorited',
      trackId: 'trk-09',
      deviceName: 'Pixel 9 Pro',
      timestamp: new Date(Date.now() - 34 * 60000).toISOString(),
    },
  ]);
  const [devices, setDevices] = useState<DeviceSession[]>(DEFAULT_DEVICES);
  const [activeDeviceId, setActiveDeviceId] = useState('dev-desktop');
  const [totalListeningMinutes, setTotalListeningMinutes] = useState(1420);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date().toISOString());
  const [isSyncing, setIsSyncing] = useState(false);

  // Playback state
  const [queueTrackIds, setQueueTrackIds] = useState<string[]>(() =>
    CATALOG_TRACKS.map((t) => t.id)
  );
  const [currentTrackId, setCurrentTrackId] = useState<string>(CATALOG_TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [volume, setVolume] = useState(0.78);
  const [shuffle, setShuffle] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);
  const [fidelity, setFidelity] = useState<AudioFidelity>('lossless');

  // Offline Vault state
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineRecords, setOfflineRecords] = useState<OfflineTrackRecord[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Social Hub state
  const [socialPosts, setSocialPosts] = useState<SharedPlaylistPost[]>(INITIAL_SHARED_POSTS);

  // Modals & Drawers
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [sharePlaylistTarget, setSharePlaylistTarget] = useState<Playlist | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const trackMap = useMemo(() => new Map(CATALOG_TRACKS.map((t) => [t.id, t])), []);
  const currentTrack = trackMap.get(currentTrackId) || CATALOG_TRACKS[0];
  const offlineSet = useMemo(
    () => new Set(offlineRecords.map((r) => r.trackId)),
    [offlineRecords]
  );
  const activeDevice =
    devices.find((d) => d.id === activeDeviceId) || devices[0];

  const queueTracks = useMemo(
    () =>
      queueTrackIds
        .map((id) => trackMap.get(id))
        .filter((t): t is Track => Boolean(t)),
    [queueTrackIds, trackMap]
  );

  const favoriteTracks = useMemo(
    () =>
      favoriteIds
        .map((id) => trackMap.get(id))
        .filter((t): t is Track => Boolean(t)),
    [favoriteIds, trackMap]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  // Load IndexedDB Offline Vault on boot
  useEffect(() => {
    void getAllOfflineRecords().then((records) => setOfflineRecords(records));
  }, []);

  // Listen to browser online/offline transitions
  useEffect(() => {
    const onOffline = () => {
      setOfflineMode(true);
      showToast('Network disconnected — switched to Offline Vault playback.');
    };
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, [showToast]);

  // Monitor Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        try {
          await ensureUserProvisionedInFirestore(user);
        } catch (err) {
          console.error('Provision user failed:', err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore when signed in
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubProfile = subscribeUserProfile(uid, (p) => {
      setDisplayName(p.displayName);
      setHandle(p.handle);
      setAvatarUrl(p.avatarUrl);
      setBio(p.bio);
      setFavoriteIds(p.favoriteTrackIds);
      setTotalListeningMinutes(p.totalListeningMinutes);
    });

    const unsubSync = subscribeCloudSyncState(uid, (s) => {
      setSyncCode(s.syncCode);
      setActiveDeviceId(s.activeDeviceId);
      setFidelity(s.fidelity);
      chillAudioPlayer.setFidelity(s.fidelity);
      setLastSyncedAt(s.updatedAt);
      if (s.queueTrackIds.length > 0) {
        setQueueTrackIds(s.queueTrackIds);
      }
    });

    const unsubActivity = subscribeUserActivity(uid, (items) => {
      setRecentActivity(items);
    });

    const unsubPlaylists = subscribeUserPlaylists(uid, (pls) => {
      if (pls.length > 0) {
        setPlaylists(pls);
      }
    });

    const unsubSocial = subscribeSocialPosts(uid, (posts) => {
      if (posts.length > 0) {
        setSocialPosts(posts);
      }
    });

    return () => {
      unsubProfile();
      unsubSync();
      unsubActivity();
      unsubPlaylists();
      unsubSocial();
    };
  }, [authReady, firebaseUser]);

  // Express Cloud Sync fallback & SSE when not signed into Firebase
  const applyExpressProfile = useCallback((p: CloudProfile) => {
    setDisplayName(p.displayName);
    setHandle(p.handle);
    setAvatarUrl(p.avatarUrl);
    setBio(p.bio);
    setFavoriteIds(p.favoriteTrackIds);
    setPlaylists(p.playlists);
    setRecentActivity(p.recentActivity);
    setDevices(p.devices);
    setActiveDeviceId(p.playback.activeDeviceId);
    setFidelity(p.playback.fidelity);
    chillAudioPlayer.setFidelity(p.playback.fidelity);
    setTotalListeningMinutes(p.totalListeningMinutes);
    setLastSyncedAt(p.lastSyncedAt);
    if (p.playback.queueTrackIds.length > 0) {
      setQueueTrackIds(p.playback.queueTrackIds);
    }
  }, []);

  useEffect(() => {
    if (firebaseUser) return;
    const cached = loadLocalProfileCache(syncCode);
    if (cached) applyExpressProfile(cached);

    void fetchCloudProfile(syncCode)
      .then(applyExpressProfile)
      .catch(() => {
        // offline or unavailable, local cache already applied
      });

    void fetchSocialHub()
      .then((posts) => {
        if (posts.length > 0) setSocialPosts(posts);
      })
      .catch(() => {
        // keep initial posts offline
      });

    const unsubSse = subscribeProfileStream(syncCode, applyExpressProfile);
    return () => unsubSse();
  }, [firebaseUser, syncCode, applyExpressProfile]);

  const buildCurrentExpressProfile = useCallback(
    (overrides?: Partial<CloudProfile>): CloudProfile => ({
      syncCode,
      displayName,
      handle,
      avatarUrl,
      bio,
      favoriteTrackIds: favoriteIds,
      playlists,
      recentActivity,
      devices,
      playback: {
        currentTrackId,
        positionSec,
        isPlaying,
        activeDeviceId,
        fidelity,
        queueTrackIds,
        updatedAt: new Date().toISOString(),
      },
      totalListeningMinutes,
      lastSyncedAt: new Date().toISOString(),
      ...overrides,
    }),
    [
      syncCode,
      displayName,
      handle,
      avatarUrl,
      bio,
      favoriteIds,
      playlists,
      recentActivity,
      devices,
      currentTrackId,
      positionSec,
      isPlaying,
      activeDeviceId,
      fidelity,
      queueTrackIds,
      totalListeningMinutes,
    ]
  );

  const persistGuestCloud = useCallback(
    async (overrides?: Partial<CloudProfile>) => {
      if (firebaseUser || offlineMode) return;
      try {
        const next = buildCurrentExpressProfile(overrides);
        const saved = await pushCloudProfile(next);
        setLastSyncedAt(saved.lastSyncedAt);
      } catch {
        // graceful offline tolerance
      }
    },
    [firebaseUser, offlineMode, buildCurrentExpressProfile]
  );

  // Audio playback engine synchronization
  const startAudioForTrack = useCallback(
    async (track: Track, offsetSec: number) => {
      try {
        const sourceKind = await chillAudioPlayer.playTrack(track, offsetSec, offlineMode);
        setIsPlaying(true);
        if (offlineMode && sourceKind === 'offline-cache') {
          showToast(`Playing "${track.title}" from Offline Vault`);
        }
      } catch (err) {
        setIsPlaying(false);
        showToast(
          err instanceof Error
            ? err.message
            : 'Track unavailable in Offline Mode. Download it first.'
        );
      }
    },
    [offlineMode, showToast]
  );

  const recordActivity = useCallback(
    (entry: Omit<ActivityItem, 'id' | 'timestamp'>) => {
      const item: ActivityItem = {
        ...entry,
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      setRecentActivity((prev) => [item, ...prev].slice(0, 30));

      if (firebaseUser) {
        void logActivityInFirestore(firebaseUser.uid, entry);
      } else {
        void persistGuestCloud({
          recentActivity: [item, ...recentActivity].slice(0, 30),
        });
      }
    },
    [firebaseUser, persistGuestCloud, recentActivity]
  );

  const handlePlayTrack = useCallback(
    (track: Track, nextQueue?: Track[]) => {
      const updatedQueueIds = nextQueue ? nextQueue.map((t) => t.id) : queueTrackIds;
      if (nextQueue) {
        setQueueTrackIds(updatedQueueIds);
      }
      setCurrentTrackId(track.id);
      setPositionSec(0);
      void startAudioForTrack(track, 0);
      recordActivity({
        type: 'played',
        trackId: track.id,
        deviceName: activeDevice.name,
      });

      if (firebaseUser) {
        void updatePlaybackSyncInFirestore(firebaseUser.uid, {
          currentTrackId: track.id,
          positionSec: 0,
          isPlaying: true,
          queueTrackIds: updatedQueueIds,
        });
      } else {
        void persistGuestCloud({
          playback: {
            currentTrackId: track.id,
            positionSec: 0,
            isPlaying: true,
            activeDeviceId,
            fidelity,
            queueTrackIds: updatedQueueIds,
            updatedAt: new Date().toISOString(),
          },
        });
      }
    },
    [
      queueTrackIds,
      startAudioForTrack,
      recordActivity,
      activeDevice.name,
      firebaseUser,
      persistGuestCloud,
      activeDeviceId,
      fidelity,
    ]
  );

  const handlePlayPlaylist = useCallback(
    (playlist: Playlist) => {
      const tracks = playlist.trackIds
        .map((id) => trackMap.get(id))
        .filter((t): t is Track => Boolean(t));
      if (tracks.length === 0) return;

      const playable = offlineMode
        ? tracks.filter((t) => offlineSet.has(t.id))
        : tracks;
      if (playable.length === 0) {
        showToast('No tracks in this playlist are downloaded for Offline Mode yet.');
        return;
      }
      handlePlayTrack(playable[0], tracks);
    },
    [trackMap, offlineMode, offlineSet, handlePlayTrack, showToast]
  );

  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying) {
      chillAudioPlayer.stop();
      setIsPlaying(false);
      if (firebaseUser) {
        void updatePlaybackSyncInFirestore(firebaseUser.uid, {
          currentTrackId,
          positionSec,
          isPlaying: false,
          queueTrackIds,
        });
      }
    } else {
      void startAudioForTrack(currentTrack, positionSec);
    }
  }, [isPlaying, firebaseUser, currentTrackId, positionSec, queueTrackIds, startAudioForTrack, currentTrack]);

  // Unlimited Skips: Next & Previous
  const handleNextTrack = useCallback(() => {
    if (queueTracks.length === 0) return;
    let nextTrack: Track;
    if (shuffle && queueTracks.length > 1) {
      const candidates = queueTracks.filter((t) => t.id !== currentTrackId);
      nextTrack = candidates[Math.floor(Math.random() * candidates.length)] || queueTracks[0];
    } else {
      const idx = queueTracks.findIndex((t) => t.id === currentTrackId);
      nextTrack = queueTracks[(idx + 1) % queueTracks.length];
    }
    handlePlayTrack(nextTrack);
  }, [queueTracks, shuffle, currentTrackId, handlePlayTrack]);

  const handlePrevTrack = useCallback(() => {
    if (positionSec > 4) {
      setPositionSec(0);
      if (isPlaying) void startAudioForTrack(currentTrack, 0);
      return;
    }
    if (queueTracks.length === 0) return;
    const idx = queueTracks.findIndex((t) => t.id === currentTrackId);
    const prevIdx = idx <= 0 ? queueTracks.length - 1 : idx - 1;
    handlePlayTrack(queueTracks[prevIdx]);
  }, [positionSec, isPlaying, startAudioForTrack, currentTrack, queueTracks, currentTrackId, handlePlayTrack]);

  // Keep a ref to latest skip handler for playback timer auto-advance
  const nextTrackRef = useRef(handleNextTrack);
  nextTrackRef.current = handleNextTrack;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPositionSec((prev) => {
        if (prev + 1 >= currentTrack.durationSec) {
          if (repeatOne) {
            void startAudioForTrack(currentTrack, 0);
            return 0;
          }
          setTimeout(() => nextTrackRef.current(), 0);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, repeatOne, startAudioForTrack]);

  // Spacebar play/pause shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlayPause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlayPause]);

  const handleSeek = (sec: number) => {
    setPositionSec(sec);
    if (isPlaying) {
      void startAudioForTrack(currentTrack, sec);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    chillAudioPlayer.setVolume(vol);
  };

  const handleToggleFidelity = () => {
    const next: AudioFidelity = fidelity === 'lossless' ? 'high' : 'lossless';
    setFidelity(next);
    chillAudioPlayer.setFidelity(next);
    showToast(next === 'lossless' ? 'Switched to 24-bit Lossless audio' : 'Switched to 320 kbps High audio');
    if (firebaseUser) {
      void updateFidelityInFirestore(firebaseUser.uid, next);
    } else {
      void persistGuestCloud();
    }
  };

  const handleToggleFavorite = (trackId: string) => {
    const exists = favoriteIds.includes(trackId);
    const next = exists
      ? favoriteIds.filter((id) => id !== trackId)
      : [trackId, ...favoriteIds];
    setFavoriteIds(next);

    if (!exists) {
      recordActivity({
        type: 'favorited',
        trackId,
        deviceName: activeDevice.name,
      });
    }

    if (firebaseUser) {
      void updateFavoritesInFirestore(firebaseUser.uid, next);
    } else {
      void persistGuestCloud({ favoriteTrackIds: next });
    }
  };

  // Offline Download Handlers
  const handleDownloadTrack = async (track: Track) => {
    if (offlineSet.has(track.id) || downloadingIds.has(track.id)) return;
    setDownloadingIds((prev) => new Set(prev).add(track.id));
    try {
      const wavBlob = await renderTrackToOfflineWav(track);
      const record = await saveOfflineTrack(track, wavBlob);
      setOfflineRecords((prev) => [
        ...prev.filter((r) => r.trackId !== track.id),
        record,
      ]);
      recordActivity({
        type: 'downloaded',
        trackId: track.id,
        deviceName: activeDevice.name,
      });
      showToast(`Cached "${track.title}" (${(wavBlob.size / (1024 * 1024)).toFixed(1)} MB WAV)`);
    } catch {
      showToast(`Failed to cache "${track.title}" offline.`);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  };

  const handleDownloadPlaylist = async (playlist: Playlist) => {
    const targets = playlist.trackIds
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => Boolean(t))
      .filter((t) => !offlineSet.has(t.id));
    if (targets.length === 0) {
      showToast(`All tracks in "${playlist.name}" are already cached offline.`);
      return;
    }
    showToast(`Caching ${targets.length} lossless tracks from "${playlist.name}"...`);
    for (const t of targets) {
      await handleDownloadTrack(t);
    }
  };

  const handleDownloadAllCatalog = async () => {
    const targets = CATALOG_TRACKS.filter((t) => !offlineSet.has(t.id));
    if (targets.length === 0) return;
    showToast(`Caching ${targets.length} tracks to Offline Vault...`);
    for (const t of targets) {
      await handleDownloadTrack(t);
    }
  };

  const handleRemoveOfflineTrack = async (trackId: string) => {
    await removeOfflineTrack(trackId);
    setOfflineRecords((prev) => prev.filter((r) => r.trackId !== trackId));
    showToast('Removed track from Offline Vault.');
  };

  const handleClearAllOffline = async () => {
    await clearAllOfflineTracks();
    setOfflineRecords([]);
    setOfflineMode(false);
    showToast('Cleared Offline Vault cache.');
  };

  // Playlist CRUD
  const handleCreatePlaylist = (name: string, description: string, coverUrl: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      coverUrl,
      ownerName: displayName,
      ownerHandle: handle,
      trackIds: [currentTrack.id],
      isPublic: false,
      updatedAt: new Date().toISOString(),
    };
    const next = [newPl, ...playlists];
    setPlaylists(next);
    setSelectedPlaylistId(newPl.id);
    setActiveTab('library');
    showToast(`Created playlist "${name}"`);

    if (firebaseUser) {
      void createPlaylistInFirestore(firebaseUser.uid, newPl);
    } else {
      void persistGuestCloud({ playlists: next });
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const next = playlists.filter((p) => p.id !== playlistId);
    setPlaylists(next);
    setSelectedPlaylistId(next[0]?.id || null);
    if (firebaseUser) {
      void deletePlaylistInFirestore(playlistId);
    } else {
      void persistGuestCloud({ playlists: next });
    }
  };

  const handleAddTrackToPlaylist = (playlistId: string, trackId: string) => {
    const target = playlists.find((p) => p.id === playlistId);
    if (!target || target.trackIds.includes(trackId)) return;
    const updatedTrackIds = [...target.trackIds, trackId];
    const next = playlists.map((p) =>
      p.id === playlistId ? { ...p, trackIds: updatedTrackIds, updatedAt: new Date().toISOString() } : p
    );
    setPlaylists(next);
    showToast(`Added to "${target.name}"`);

    if (firebaseUser) {
      void updatePlaylistTracksInFirestore(playlistId, updatedTrackIds);
    } else {
      void persistGuestCloud({ playlists: next });
    }
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    const target = playlists.find((p) => p.id === playlistId);
    if (!target) return;
    const updatedTrackIds = target.trackIds.filter((id) => id !== trackId);
    const next = playlists.map((p) =>
      p.id === playlistId ? { ...p, trackIds: updatedTrackIds, updatedAt: new Date().toISOString() } : p
    );
    setPlaylists(next);
    if (firebaseUser) {
      void updatePlaylistTracksInFirestore(playlistId, updatedTrackIds);
    } else {
      void persistGuestCloud({ playlists: next });
    }
  };

  // Social Hub handlers
  const handleSharePlaylist = async (playlist: Playlist, note: string) => {
    if (firebaseUser) {
      const code = await publishSharedPostInFirestore(firebaseUser.uid, {
        playlist,
        note,
        authorName: displayName,
        authorHandle: handle,
        authorAvatarUrl: avatarUrl,
      });
      recordActivity({
        type: 'shared',
        playlistId: playlist.id,
        playlistName: playlist.name,
        deviceName: activeDevice.name,
      });
      showToast(`Published "${playlist.name}" to Social Hub (Code: ${code})`);
    } else {
      const created = await sharePlaylistToHub({
        playlist,
        note,
        sharedBy: { name: displayName, handle, avatarUrl },
      });
      setSocialPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      recordActivity({
        type: 'shared',
        playlistId: playlist.id,
        playlistName: playlist.name,
        deviceName: activeDevice.name,
      });
      showToast(`Shared "${playlist.name}" (Code: ${created.shareCode})`);
    }
    setActiveTab('social');
  };

  const handleSaveSharedToLibrary = async (post: SharedPlaylistPost) => {
    const imported: Playlist = {
      ...post.playlist,
      id: `pl-saved-${Date.now()}`,
      ownerName: displayName,
      ownerHandle: handle,
      isPublic: false,
      updatedAt: new Date().toISOString(),
    };
    const next = [imported, ...playlists];
    setPlaylists(next);
    showToast(`Saved "${post.playlist.name}" to your Library`);

    if (firebaseUser) {
      await createPlaylistInFirestore(firebaseUser.uid, imported);
    } else {
      void persistGuestCloud({ playlists: next });
      void recordSharedPlaylistSave(post.id).catch(() => {});
    }
  };

  const handleLikeSharedPost = async (post: SharedPlaylistPost) => {
    const nextLiked = !post.likedByMe;
    const nextLikes = Math.max(0, post.likes + (nextLiked ? 1 : -1));
    setSocialPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likedByMe: nextLiked, likes: nextLikes } : p
      )
    );

    if (firebaseUser) {
      await toggleLikeSharedPostInFirestore(
        firebaseUser.uid,
        post.id,
        Boolean(post.likedByMe),
        post.likes
      );
    } else {
      try {
        await reactToSharedPlaylist(post.id, nextLiked ? 1 : -1);
      } catch {
        // keep optimistic local state
      }
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (firebaseUser) {
      await addCommentToSharedPostInFirestore(firebaseUser.uid, postId, {
        authorName: displayName,
        authorHandle: handle,
        text,
      });
    } else {
      try {
        const updated = await commentOnSharedPlaylist(postId, {
          authorName: displayName,
          authorHandle: handle,
          text,
        });
        setSocialPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      } catch {
        setSocialPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [
                    ...p.comments,
                    {
                      id: `cmt-${Date.now()}`,
                      authorName: displayName,
                      authorHandle: handle,
                      text,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : p
          )
        );
      }
    }
  };

  const handleImportByCode = async (code: string) => {
    let found: SharedPlaylistPost | null = null;
    if (firebaseUser) {
      found = await importSharedPostByCodeFromFirestore(code);
    }
    if (!found) {
      found = await importPlaylistByShareCode(code);
    }
    await handleSaveSharedToLibrary(found);
  };

  // Cloud Sync & Google Auth Handlers
  const handleSignInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Signed in with Google — Firestore cloud sync active.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google sign-in was cancelled.');
    }
  };

  const handleSignOutGoogle = async () => {
    await signOut(auth);
    showToast('Signed out of Google account.');
  };

  const handleSwitchSyncCode = async (newCode: string) => {
    const clean = newCode.trim().toUpperCase();
    setSyncCode(clean);
    setStoredSyncCode(clean);
    if (!firebaseUser) {
      const profile = await fetchCloudProfile(clean);
      applyExpressProfile(profile);
    }
    showToast(`Linked to Cloud Sync code ${clean}`);
  };

  const handleTransferDevice = async (device: DeviceSession) => {
    setActiveDeviceId(device.id);
    if (firebaseUser) {
      await transferDeviceInFirestore(firebaseUser.uid, {
        activeDeviceId: device.id,
        activeDeviceName: device.name,
        currentTrackId,
        positionSec,
        isPlaying,
      });
    } else {
      const updated = await transferPlaybackDevice(syncCode, {
        deviceId: device.id,
        currentTrackId,
        positionSec,
        isPlaying,
      });
      applyExpressProfile(updated);
    }
    showToast(`Transferred playback to ${device.name}`);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      if (firebaseUser) {
        await updatePlaybackSyncInFirestore(firebaseUser.uid, {
          currentTrackId,
          positionSec,
          isPlaying,
          queueTrackIds,
        });
      } else {
        await persistGuestCloud();
      }
      setLastSyncedAt(new Date().toISOString());
      showToast('Cloud state synchronized.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#090B0E] text-[#F1F5F9] overflow-hidden">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSyncModal={() => setSyncModalOpen(true)}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          selectedPlaylistId={selectedPlaylistId}
          playlists={playlists}
          favoriteCount={favoriteIds.length}
          offlineRecords={offlineRecords}
          totalCatalogCount={CATALOG_TRACKS.length}
          offlineMode={offlineMode}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onSelectTab={setActiveTab}
          onSelectPlaylist={(id) => {
            setSelectedPlaylistId(id);
            setActiveTab('library');
          }}
          onCreatePlaylist={() => setCreatePlaylistOpen(true)}
          onToggleOfflineMode={() => {
            const next = !offlineMode;
            setOfflineMode(next);
            showToast(
              next
                ? 'Offline Mode enabled — playing strictly from local WAV cache.'
                : 'Online Cloud Stream restored.'
            );
          }}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'discover' && (
              <DiscoverView
                tracks={CATALOG_TRACKS}
                playlists={playlists}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                favoriteIds={favoriteIds}
                offlineTrackIds={offlineSet}
                downloadingIds={downloadingIds}
                offlineMode={offlineMode}
                onPlayTrack={handlePlayTrack}
                onPlayPlaylist={handlePlayPlaylist}
                onTogglePlayPause={handleTogglePlayPause}
                onToggleFavorite={handleToggleFavorite}
                onDownloadTrack={(t) => void handleDownloadTrack(t)}
                onDownloadPlaylist={(pl) => void handleDownloadPlaylist(pl)}
                onRemoveOfflineTrack={(id) => void handleRemoveOfflineTrack(id)}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
              />
            )}

            {activeTab === 'library' && (
              <LibraryView
                playlists={playlists}
                selectedPlaylistId={selectedPlaylistId}
                allTracks={CATALOG_TRACKS}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                favoriteIds={favoriteIds}
                offlineTrackIds={offlineSet}
                downloadingIds={downloadingIds}
                offlineMode={offlineMode}
                onSelectPlaylist={setSelectedPlaylistId}
                onCreatePlaylist={() => setCreatePlaylistOpen(true)}
                onDeletePlaylist={handleDeletePlaylist}
                onPlayTrack={handlePlayTrack}
                onPlayPlaylist={handlePlayPlaylist}
                onTogglePlayPause={handleTogglePlayPause}
                onToggleFavorite={handleToggleFavorite}
                onDownloadTrack={(t) => void handleDownloadTrack(t)}
                onDownloadPlaylist={(pl) => void handleDownloadPlaylist(pl)}
                onRemoveOfflineTrack={(id) => void handleRemoveOfflineTrack(id)}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
                onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
                onOpenShareModal={(pl) => setSharePlaylistTarget(pl)}
              />
            )}

            {activeTab === 'offline' && (
              <OfflineVaultView
                allTracks={CATALOG_TRACKS}
                playlists={playlists}
                offlineRecords={offlineRecords}
                downloadingIds={downloadingIds}
                offlineMode={offlineMode}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                favoriteIds={favoriteIds}
                onToggleOfflineMode={() => setOfflineMode((prev) => !prev)}
                onDownloadTrack={(t) => void handleDownloadTrack(t)}
                onDownloadAllCatalog={() => void handleDownloadAllCatalog()}
                onRemoveOfflineTrack={(id) => void handleRemoveOfflineTrack(id)}
                onClearAllOffline={() => void handleClearAllOffline()}
                onPlayTrack={handlePlayTrack}
                onTogglePlayPause={handleTogglePlayPause}
                onToggleFavorite={handleToggleFavorite}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
              />
            )}

            {activeTab === 'social' && (
              <SocialHubView
                posts={socialPosts}
                userPlaylists={playlists}
                allTracks={CATALOG_TRACKS}
                isSignedIn={Boolean(firebaseUser)}
                onSignIn={() => void handleSignInGoogle()}
                onPlayPlaylist={handlePlayPlaylist}
                onPlayTrack={(t) => handlePlayTrack(t)}
                onSaveToLibrary={(p) => void handleSaveSharedToLibrary(p)}
                onDownloadPlaylist={(pl) => void handleDownloadPlaylist(pl)}
                onLikePost={(p) => void handleLikeSharedPost(p)}
                onAddComment={(id, text) => void handleAddComment(id, text)}
                onOpenShareModal={(pl) => setSharePlaylistTarget(pl)}
                onImportByCode={handleImportByCode}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                displayName={displayName}
                handle={handle}
                avatarUrl={avatarUrl}
                bio={bio}
                email={firebaseUser?.email || null}
                isSignedIn={Boolean(firebaseUser)}
                syncCode={syncCode}
                activeDeviceName={activeDevice.name}
                totalListeningMinutes={totalListeningMinutes}
                favoriteTracks={favoriteTracks}
                recentActivity={recentActivity}
                allTracks={CATALOG_TRACKS}
                playlists={playlists}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                favoriteIds={favoriteIds}
                offlineTrackIds={offlineSet}
                downloadingIds={downloadingIds}
                offlineMode={offlineMode}
                onSignIn={() => void handleSignInGoogle()}
                onSignOut={() => void handleSignOutGoogle()}
                onOpenSyncModal={() => setSyncModalOpen(true)}
                onPlayTrack={handlePlayTrack}
                onTogglePlayPause={handleTogglePlayPause}
                onToggleFavorite={handleToggleFavorite}
                onDownloadTrack={(t) => void handleDownloadTrack(t)}
                onRemoveOfflineTrack={(id) => void handleRemoveOfflineTrack(id)}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
              />
            )}
          </div>
        </main>
      </div>

      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        positionSec={positionSec}
        volume={volume}
        shuffle={shuffle}
        repeatOne={repeatOne}
        fidelity={fidelity}
        isFavorite={favoriteIds.includes(currentTrack.id)}
        isOfflineCached={offlineSet.has(currentTrack.id)}
        isDownloading={downloadingIds.has(currentTrack.id)}
        activeDeviceName={activeDevice.name}
        queueOpen={queueOpen}
        onTogglePlayPause={handleTogglePlayPause}
        onPrevTrack={handlePrevTrack}
        onNextTrack={handleNextTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleShuffle={() => setShuffle((prev) => !prev)}
        onToggleRepeat={() => setRepeatOne((prev) => !prev)}
        onToggleFidelity={handleToggleFidelity}
        onToggleFavorite={() => handleToggleFavorite(currentTrack.id)}
        onDownloadCurrent={() => void handleDownloadTrack(currentTrack)}
        onOpenDeviceSync={() => setSyncModalOpen(true)}
        onToggleQueue={() => setQueueOpen((prev) => !prev)}
      />

      <QueueDrawer
        open={queueOpen}
        queue={queueTracks}
        currentTrackId={currentTrackId}
        onClose={() => setQueueOpen(false)}
        onPlayFromQueue={(t) => handlePlayTrack(t)}
      />

      <CloudSyncModal
        open={syncModalOpen}
        isSignedIn={Boolean(firebaseUser)}
        userEmail={firebaseUser?.email || null}
        syncCode={syncCode}
        lastSyncedAt={lastSyncedAt}
        devices={devices}
        activeDeviceId={activeDeviceId}
        currentTrack={currentTrack}
        positionSec={positionSec}
        isSyncing={isSyncing}
        onClose={() => setSyncModalOpen(false)}
        onSignInGoogle={() => void handleSignInGoogle()}
        onSignOutGoogle={() => void handleSignOutGoogle()}
        onSwitchSyncCode={handleSwitchSyncCode}
        onTransferDevice={handleTransferDevice}
        onSyncNow={handleSyncNow}
      />

      <CreatePlaylistModal
        open={createPlaylistOpen}
        onClose={() => setCreatePlaylistOpen(false)}
        onCreate={handleCreatePlaylist}
      />

      <SharePlaylistModal
        playlist={sharePlaylistTarget}
        allPlaylists={playlists}
        onClose={() => setSharePlaylistTarget(null)}
        onShare={handleSharePlaylist}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 right-5 z-50 rounded-lg border border-white/[0.12] bg-[#141A24] px-4 py-2.5 text-xs font-medium text-[#F1F5F9] shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MusicChillShell />
    </ErrorBoundary>
  );
}

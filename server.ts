import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'cloud-sync.json');

interface ServerComment {
  id: string;
  authorName: string;
  authorHandle: string;
  text: string;
  createdAt: string;
}

interface ServerPlaylist {
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

interface ServerSharedPost {
  id: string;
  shareCode: string;
  playlist: ServerPlaylist;
  note: string;
  sharedBy: {
    name: string;
    handle: string;
    avatarUrl: string;
  };
  likes: number;
  savesCount: number;
  comments: ServerComment[];
  sharedAt: string;
}

interface ServerProfile {
  syncCode: string;
  displayName: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  favoriteTrackIds: string[];
  playlists: ServerPlaylist[];
  recentActivity: Array<{
    id: string;
    type: string;
    trackId?: string;
    playlistId?: string;
    playlistName?: string;
    deviceName: string;
    timestamp: string;
  }>;
  devices: Array<{
    id: string;
    name: string;
    platform: string;
    lastActiveAt: string;
  }>;
  playback: {
    currentTrackId: string;
    positionSec: number;
    isPlaying: boolean;
    activeDeviceId: string;
    fidelity: 'lossless' | 'high';
    queueTrackIds: string[];
    updatedAt: string;
  };
  totalListeningMinutes: number;
  lastSyncedAt: string;
}

interface StoreShape {
  profiles: Record<string, ServerProfile>;
  sharedPosts: ServerSharedPost[];
}

const DEFAULT_COVER_MIDNIGHT = '/src/assets/images/cover_midnight_vinyl_1795571470975.jpg';
const DEFAULT_COVER_ESPRESSO = '/src/assets/images/cover_velvet_espresso_1795571471804.jpg';
const DEFAULT_COVER_SOLAR = '/src/assets/images/cover_solar_echo_1795571471876.jpg';
const DEFAULT_COVER_RAIN = '/src/assets/images/cover_rain_studio_1795571472175.jpg';
const DEFAULT_AVATAR = '/src/assets/images/avatar_user_profile_1795571473261.jpg';

function buildDefaultProfile(syncCode: string): ServerProfile {
  const now = new Date().toISOString();
  return {
    syncCode,
    displayName: 'Maya Lin',
    handle: '@mayachill',
    avatarUrl: DEFAULT_AVATAR,
    bio: 'Curating late-night lo-fi vinyl, Nordic ambient textures, and lossless focus sessions.',
    favoriteTrackIds: ['trk-01', 'trk-03', 'trk-05', 'trk-09'],
    playlists: [
      {
        id: 'pl-my-focus',
        name: 'Deep Studio Focus',
        description: 'Zero distractions, warm analog Rhodes and gentle rain textures.',
        coverUrl: DEFAULT_COVER_MIDNIGHT,
        ownerName: 'Maya Lin',
        ownerHandle: '@mayachill',
        trackIds: ['trk-01', 'trk-02', 'trk-03', 'trk-09', 'trk-11'],
        isPublic: true,
        shareCode: 'MAYA-7429',
        updatedAt: now,
      },
      {
        id: 'pl-sunday-coffee',
        name: 'Sunday Pour Over',
        description: 'Laid-back jazz hop and acoustic warmth for slow mornings.',
        coverUrl: DEFAULT_COVER_ESPRESSO,
        ownerName: 'Maya Lin',
        ownerHandle: '@mayachill',
        trackIds: ['trk-05', 'trk-06', 'trk-07', 'trk-08'],
        isPublic: false,
        updatedAt: now,
      },
    ],
    recentActivity: [
      {
        id: 'act-1',
        type: 'played',
        trackId: 'trk-01',
        deviceName: 'Studio MacBook',
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-2',
        type: 'favorited',
        trackId: 'trk-09',
        deviceName: 'Pixel 9 Pro',
        timestamp: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-3',
        type: 'played',
        trackId: 'trk-03',
        deviceName: 'Living Room DAC',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-4',
        type: 'shared',
        playlistId: 'pl-my-focus',
        playlistName: 'Deep Studio Focus',
        deviceName: 'Studio MacBook',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
    ],
    devices: [
      {
        id: 'dev-desktop',
        name: 'Desktop Web Studio',
        platform: 'Desktop',
        lastActiveAt: now,
      },
      {
        id: 'dev-mobile',
        name: 'Pixel 9 Pro',
        platform: 'Mobile',
        lastActiveAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      },
      {
        id: 'dev-hifi',
        name: 'Living Room DAC',
        platform: 'Hi-Fi DAC',
        lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
    playback: {
      currentTrackId: 'trk-01',
      positionSec: 0,
      isPlaying: false,
      activeDeviceId: 'dev-desktop',
      fidelity: 'lossless',
      queueTrackIds: ['trk-01', 'trk-02', 'trk-03', 'trk-05', 'trk-09', 'trk-11'],
      updatedAt: now,
    },
    totalListeningMinutes: 1420,
    lastSyncedAt: now,
  };
}

function buildInitialStore(): StoreShape {
  return {
    profiles: {
      'CHILL-7429': buildDefaultProfile('CHILL-7429'),
    },
    sharedPosts: [
      {
        id: 'post-elena-1',
        shareCode: 'SOLR-8821',
        playlist: {
          id: 'shared-elena-1',
          name: 'Desert Dusk Drive',
          description: 'Warm downtempo beats and open desert chords for golden hour highways.',
          coverUrl: DEFAULT_COVER_SOLAR,
          ownerName: 'Elena Vance',
          ownerHandle: '@elenav',
          trackIds: ['trk-07', 'trk-08', 'trk-03', 'trk-11'],
          isPublic: true,
          shareCode: 'SOLR-8821',
          updatedAt: '2026-11-24T16:10:00Z',
        },
        note: 'Cached this whole set offline before heading out of cell range—zero skips needed.',
        sharedBy: {
          name: 'Elena Vance',
          handle: '@elenav',
          avatarUrl: DEFAULT_COVER_SOLAR,
        },
        likes: 18,
        savesCount: 9,
        comments: [
          {
            id: 'cmt-1',
            authorName: 'Kenji Sato',
            authorHandle: '@kenjis',
            text: 'Amber Dune Signal sounds unreal in lossless mode.',
            createdAt: '2026-11-24T16:45:00Z',
          },
        ],
        sharedAt: '2026-11-24T16:10:00Z',
      },
      {
        id: 'post-kenji-2',
        shareCode: 'TOKY-5504',
        playlist: {
          id: 'shared-kenji-2',
          name: 'Midnight Window Coding',
          description: 'Steady 78-86 BPM lo-fi beats and rain textures that stay out of your way.',
          coverUrl: DEFAULT_COVER_RAIN,
          ownerName: 'Kenji Sato',
          ownerHandle: '@kenjis',
          trackIds: ['trk-09', 'trk-10', 'trk-01', 'trk-06', 'trk-02'],
          isPublic: true,
          shareCode: 'TOKY-5504',
          updatedAt: '2026-11-24T14:20:00Z',
        },
        note: 'Sharing my late-night sprint playlist. Feel free to fork and add your own favorites.',
        sharedBy: {
          name: 'Kenji Sato',
          handle: '@kenjis',
          avatarUrl: DEFAULT_COVER_RAIN,
        },
        likes: 27,
        savesCount: 14,
        comments: [
          {
            id: 'cmt-2',
            authorName: 'Sora Morales',
            authorHandle: '@soram',
            text: 'Saved to my Offline Vault for tomorrow morning flight!',
            createdAt: '2026-11-24T15:02:00Z',
          },
        ],
        sharedAt: '2026-11-24T14:20:00Z',
      },
    ],
  };
}

function loadStore(): StoreShape {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as StoreShape;
      if (parsed && parsed.profiles && Array.isArray(parsed.sharedPosts)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read store file, initializing defaults:', err);
  }
  const initial = buildInitialStore();
  saveStore(initial);
  return initial;
}

function saveStore(data: StoreShape): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

const store = loadStore();
const sseClients = new Map<string, Set<express.Response>>();

function broadcastProfileUpdate(syncCode: string, profile: ServerProfile): void {
  const clients = sseClients.get(syncCode);
  if (!clients) return;
  const payload = `data: ${JSON.stringify({ type: 'profile_sync', profile })}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

function normalizeSyncCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24) || 'CHILL-7429';
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'Music chill' });
  });

  app.get('/api/sync/:syncCode', (req, res) => {
    const syncCode = normalizeSyncCode(req.params.syncCode);
    if (!store.profiles[syncCode]) {
      store.profiles[syncCode] = buildDefaultProfile(syncCode);
      saveStore(store);
    }
    res.json(store.profiles[syncCode]);
  });

  app.put('/api/sync/:syncCode', (req, res) => {
    const syncCode = normalizeSyncCode(req.params.syncCode);
    const existing = store.profiles[syncCode] || buildDefaultProfile(syncCode);
    const body = req.body as Partial<ServerProfile>;
    const now = new Date().toISOString();

    const updated: ServerProfile = {
      ...existing,
      displayName: typeof body.displayName === 'string' && body.displayName.trim() ? body.displayName.trim().slice(0, 60) : existing.displayName,
      handle: typeof body.handle === 'string' && body.handle.trim() ? body.handle.trim().slice(0, 40) : existing.handle,
      bio: typeof body.bio === 'string' ? body.bio.slice(0, 240) : existing.bio,
      favoriteTrackIds: Array.isArray(body.favoriteTrackIds) ? body.favoriteTrackIds.slice(0, 200) : existing.favoriteTrackIds,
      playlists: Array.isArray(body.playlists) ? body.playlists.slice(0, 50) : existing.playlists,
      recentActivity: Array.isArray(body.recentActivity) ? body.recentActivity.slice(0, 40) : existing.recentActivity,
      devices: Array.isArray(body.devices) ? body.devices.slice(0, 12) : existing.devices,
      playback: body.playback ? { ...existing.playback, ...body.playback, updatedAt: now } : existing.playback,
      totalListeningMinutes: typeof body.totalListeningMinutes === 'number' ? body.totalListeningMinutes : existing.totalListeningMinutes,
      syncCode,
      lastSyncedAt: now,
    };

    store.profiles[syncCode] = updated;
    saveStore(store);
    broadcastProfileUpdate(syncCode, updated);
    res.json(updated);
  });

  app.post('/api/sync/:syncCode/transfer', (req, res) => {
    const syncCode = normalizeSyncCode(req.params.syncCode);
    const existing = store.profiles[syncCode] || buildDefaultProfile(syncCode);
    const { deviceId, positionSec, currentTrackId, isPlaying } = req.body as {
      deviceId?: string;
      positionSec?: number;
      currentTrackId?: string;
      isPlaying?: boolean;
    };
    const now = new Date().toISOString();
    const targetDeviceId = deviceId || existing.playback.activeDeviceId;

    const updatedDevices = existing.devices.map((d) =>
      d.id === targetDeviceId ? { ...d, lastActiveAt: now } : d
    );

    const updated: ServerProfile = {
      ...existing,
      devices: updatedDevices,
      playback: {
        ...existing.playback,
        activeDeviceId: targetDeviceId,
        currentTrackId: currentTrackId || existing.playback.currentTrackId,
        positionSec: typeof positionSec === 'number' ? positionSec : existing.playback.positionSec,
        isPlaying: typeof isPlaying === 'boolean' ? isPlaying : existing.playback.isPlaying,
        updatedAt: now,
      },
      lastSyncedAt: now,
    };

    store.profiles[syncCode] = updated;
    saveStore(store);
    broadcastProfileUpdate(syncCode, updated);
    res.json(updated);
  });

  app.get('/api/sync/:syncCode/stream', (req, res) => {
    const syncCode = normalizeSyncCode(req.params.syncCode);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!sseClients.has(syncCode)) {
      sseClients.set(syncCode, new Set());
    }
    sseClients.get(syncCode)!.add(res);

    res.write(`data: ${JSON.stringify({ type: 'connected', syncCode })}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.get(syncCode)?.delete(res);
    });
  });

  app.get('/api/social/hub', (_req, res) => {
    res.json({ posts: store.sharedPosts });
  });

  app.post('/api/social/share', (req, res) => {
    const { playlist, note, sharedBy } = req.body as {
      playlist?: ServerPlaylist;
      note?: string;
      sharedBy?: { name: string; handle: string; avatarUrl: string };
    };
    if (!playlist || !playlist.name || !Array.isArray(playlist.trackIds)) {
      res.status(400).json({ error: 'Valid playlist payload required.' });
      return;
    }

    const shareCode =
      playlist.shareCode ||
      `${playlist.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const now = new Date().toISOString();
    const newPost: ServerSharedPost = {
      id: `post-${Date.now()}`,
      shareCode,
      playlist: {
        ...playlist,
        isPublic: true,
        shareCode,
        updatedAt: now,
      },
      note: (note || 'Shared from Music chill').slice(0, 280),
      sharedBy: sharedBy || {
        name: 'Maya Lin',
        handle: '@mayachill',
        avatarUrl: DEFAULT_AVATAR,
      },
      likes: 1,
      savesCount: 0,
      comments: [],
      sharedAt: now,
    };

    store.sharedPosts = [newPost, ...store.sharedPosts.filter((p) => p.shareCode !== shareCode)].slice(0, 40);
    saveStore(store);
    res.status(201).json(newPost);
  });

  app.post('/api/social/like/:shareId', (req, res) => {
    const { shareId } = req.params;
    const { delta } = req.body as { delta?: number };
    const post = store.sharedPosts.find((p) => p.id === shareId);
    if (!post) {
      res.status(404).json({ error: 'Shared playlist not found.' });
      return;
    }
    post.likes = Math.max(0, post.likes + (delta === -1 ? -1 : 1));
    saveStore(store);
    res.json(post);
  });

  app.post('/api/social/save/:shareId', (req, res) => {
    const { shareId } = req.params;
    const post = store.sharedPosts.find((p) => p.id === shareId);
    if (!post) {
      res.status(404).json({ error: 'Shared playlist not found.' });
      return;
    }
    post.savesCount += 1;
    saveStore(store);
    res.json(post);
  });

  app.post('/api/social/comment/:shareId', (req, res) => {
    const { shareId } = req.params;
    const { authorName, authorHandle, text } = req.body as {
      authorName?: string;
      authorHandle?: string;
      text?: string;
    };
    const post = store.sharedPosts.find((p) => p.id === shareId);
    if (!post) {
      res.status(404).json({ error: 'Shared playlist not found.' });
      return;
    }
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Comment text is required.' });
      return;
    }
    const comment: ServerComment = {
      id: `cmt-${Date.now()}`,
      authorName: (authorName || 'Maya Lin').slice(0, 50),
      authorHandle: (authorHandle || '@mayachill').slice(0, 40),
      text: text.trim().slice(0, 240),
      createdAt: new Date().toISOString(),
    };
    post.comments = [...post.comments, comment].slice(-30);
    saveStore(store);
    res.status(201).json(post);
  });

  app.get('/api/social/import/:shareCode', (req, res) => {
    const code = req.params.shareCode.trim().toUpperCase();
    const match = store.sharedPosts.find((p) => p.shareCode.toUpperCase() === code);
    if (!match) {
      res.status(404).json({ error: `No shared playlist found for code ${code}.` });
      return;
    }
    res.json(match);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use('/src/assets', express.static(path.join(distPath, 'src/assets')));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Music chill server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

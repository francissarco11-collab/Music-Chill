import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { COVER_ART } from '../data/catalog';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  ActivityItem,
  AudioFidelity,
  Playlist,
  SharedComment,
  SharedPlaylistPost,
} from '../types/music';

function toIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'item';
}

function makeHandle(user: User): string {
  const base = (user.displayName || user.email?.split('@')[0] || 'listener')
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 24);
  return `@${base || 'listener'}`;
}

export interface FirebaseUserSnapshot {
  displayName: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  favoriteTrackIds: string[];
  totalListeningMinutes: number;
}

export interface FirebaseSyncSnapshot {
  syncCode: string;
  currentTrackId: string;
  positionSec: number;
  isPlaying: boolean;
  activeDeviceId: string;
  activeDeviceName: string;
  fidelity: AudioFidelity;
  queueTrackIds: string[];
  updatedAt: string;
}

export async function ensureUserProvisionedInFirestore(user: User): Promise<void> {
  const uid = user.uid;
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');
  const syncRef = doc(db, 'users', uid, 'sync', 'state');

  try {
    const snap = await getDoc(userRef);
    const displayName = (user.displayName || 'Maya Lin').slice(0, 60);
    const handle = makeHandle(user);
    const avatarUrl = (user.photoURL || COVER_ART.userAvatar).slice(0, 512);

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        displayName,
        handle,
        avatarUrl,
        bio: 'Curating late-night lo-fi vinyl, Nordic ambient textures, and lossless focus sessions.',
        favoriteTrackIds: ['trk-01', 'trk-03', 'trk-05', 'trk-09'],
        totalListeningMinutes: 1420,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const starterPlaylistId = sanitizeId(`pl-focus-${uid.slice(0, 8)}`);
      await setDoc(doc(db, 'playlists', starterPlaylistId), {
        id: starterPlaylistId,
        ownerId: uid,
        ownerName: displayName,
        ownerHandle: handle,
        name: 'Deep Studio Focus',
        description: 'Zero distractions, warm analog Rhodes and gentle rain textures.',
        coverUrl: COVER_ART.midnightVinyl,
        trackIds: ['trk-01', 'trk-02', 'trk-03', 'trk-09', 'trk-11'],
        isPublic: true,
        shareCode: `CHILL-${uid.slice(0, 4).toUpperCase()}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const actId = sanitizeId(`act-welcome-${Date.now()}`);
      await setDoc(doc(db, 'users', uid, 'activity', actId), {
        id: actId,
        uid,
        type: 'played',
        trackId: 'trk-01',
        deviceName: 'Desktop Web Studio',
        createdAt: serverTimestamp(),
      });
    }

    if (user.email) {
      const privSnap = await getDoc(privateRef);
      if (!privSnap.exists()) {
        await setDoc(privateRef, {
          uid,
          email: user.email.slice(0, 254),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const syncSnap = await getDoc(syncRef);
    if (!syncSnap.exists()) {
      await setDoc(syncRef, {
        uid,
        syncCode: `CHILL-${uid.slice(0, 4).toUpperCase()}`,
        currentTrackId: 'trk-01',
        positionSec: 0,
        isPlaying: false,
        activeDeviceId: 'dev-desktop',
        activeDeviceName: 'Desktop Web Studio',
        fidelity: 'lossless',
        queueTrackIds: ['trk-01', 'trk-02', 'trk-03', 'trk-05', 'trk-09', 'trk-11'],
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: FirebaseUserSnapshot) => void
): () => void {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onData({
        displayName: String(d.displayName || 'Listener'),
        handle: String(d.handle || '@listener'),
        avatarUrl: String(d.avatarUrl || COVER_ART.userAvatar),
        bio: String(d.bio || ''),
        favoriteTrackIds: Array.isArray(d.favoriteTrackIds) ? d.favoriteTrackIds.map(String) : [],
        totalListeningMinutes: Number(d.totalListeningMinutes || 0),
      });
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeCloudSyncState(
  uid: string,
  onData: (syncState: FirebaseSyncSnapshot) => void
): () => void {
  const path = `users/${uid}/sync/state`;
  return onSnapshot(
    doc(db, 'users', uid, 'sync', 'state'),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onData({
        syncCode: String(d.syncCode || 'CHILL-7429'),
        currentTrackId: String(d.currentTrackId || 'trk-01'),
        positionSec: Number(d.positionSec || 0),
        isPlaying: Boolean(d.isPlaying),
        activeDeviceId: String(d.activeDeviceId || 'dev-desktop'),
        activeDeviceName: String(d.activeDeviceName || 'Desktop Web Studio'),
        fidelity: d.fidelity === 'high' ? 'high' : 'lossless',
        queueTrackIds: Array.isArray(d.queueTrackIds) ? d.queueTrackIds.map(String) : [],
        updatedAt: toIso(d.updatedAt),
      });
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeUserActivity(
  uid: string,
  onData: (items: ActivityItem[]) => void
): () => void {
  const path = `users/${uid}/activity`;
  const q = query(
    collection(db, 'users', uid, 'activity'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(25)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: ActivityItem[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id || docSnap.id),
          type: (d.type as ActivityItem['type']) || 'played',
          trackId: d.trackId ? String(d.trackId) : undefined,
          playlistId: d.playlistId ? String(d.playlistId) : undefined,
          playlistName: d.playlistName ? String(d.playlistName) : undefined,
          deviceName: String(d.deviceName || 'Desktop Web Studio'),
          timestamp: toIso(d.createdAt),
        };
      });
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeUserPlaylists(
  uid: string,
  onData: (playlists: Playlist[]) => void
): () => void {
  const path = 'playlists';
  const q = query(collection(db, 'playlists'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const playlists: Playlist[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id || docSnap.id),
          name: String(d.name || 'Untitled Playlist'),
          description: String(d.description || ''),
          coverUrl: String(d.coverUrl || COVER_ART.midnightVinyl),
          ownerName: String(d.ownerName || 'Listener'),
          ownerHandle: String(d.ownerHandle || '@listener'),
          trackIds: Array.isArray(d.trackIds) ? d.trackIds.map(String) : [],
          isPublic: Boolean(d.isPublic),
          shareCode: d.shareCode ? String(d.shareCode) : undefined,
          updatedAt: toIso(d.updatedAt),
        };
      });
      onData(playlists);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeSocialPosts(
  uid: string | null,
  onData: (posts: SharedPlaylistPost[]) => void
): () => void {
  const path = 'sharedPosts';
  const q = query(
    collection(db, 'sharedPosts'),
    where('isPublished', '==', true),
    orderBy('createdAt', 'desc'),
    limit(25)
  );
  return onSnapshot(
    q,
    async (snap) => {
      const posts = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const d = docSnap.data();
          const postId = String(d.id || docSnap.id);

          let likedByMe = false;
          if (uid) {
            try {
              const likeSnap = await getDoc(doc(db, 'sharedPosts', postId, 'likes', uid));
              likedByMe = likeSnap.exists();
            } catch {
              likedByMe = false;
            }
          }

          let comments: SharedComment[] = [];
          try {
            const cQuery = query(
              collection(db, 'sharedPosts', postId, 'comments'),
              where('isPublished', '==', true),
              orderBy('createdAt', 'asc'),
              limit(20)
            );
            const cSnap = await getDocs(cQuery);
            comments = cSnap.docs.map((cDoc) => {
              const cd = cDoc.data();
              return {
                id: String(cd.id || cDoc.id),
                authorName: String(cd.authorName || 'Listener'),
                authorHandle: String(cd.authorHandle || '@listener'),
                text: String(cd.text || ''),
                createdAt: toIso(cd.createdAt),
              };
            });
          } catch {
            comments = [];
          }

          const post: SharedPlaylistPost = {
            id: postId,
            shareCode: String(d.shareCode || ''),
            playlist: {
              id: String(d.playlistId || postId),
              name: String(d.playlistName || 'Shared Mix'),
              description: String(d.playlistDescription || ''),
              coverUrl: String(d.coverUrl || COVER_ART.midnightVinyl),
              ownerName: String(d.authorName || 'Listener'),
              ownerHandle: String(d.authorHandle || '@listener'),
              trackIds: Array.isArray(d.trackIds) ? d.trackIds.map(String) : [],
              isPublic: true,
              shareCode: String(d.shareCode || ''),
              updatedAt: toIso(d.updatedAt),
            },
            note: String(d.note || ''),
            sharedBy: {
              name: String(d.authorName || 'Listener'),
              handle: String(d.authorHandle || '@listener'),
              avatarUrl: String(d.authorAvatarUrl || COVER_ART.userAvatar),
            },
            likes: Number(d.likesCount || 0),
            likedByMe,
            savesCount: Number(d.savesCount || 0),
            comments,
            sharedAt: toIso(d.createdAt),
          };
          return post;
        })
      );
      onData(posts);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function updateFavoritesInFirestore(uid: string, favoriteTrackIds: string[]): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      favoriteTrackIds: favoriteTrackIds.slice(0, 100),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function logActivityInFirestore(
  uid: string,
  entry: Omit<ActivityItem, 'id' | 'timestamp'>
): Promise<void> {
  const id = sanitizeId(`act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const path = `users/${uid}/activity/${id}`;
  try {
    const payload: Record<string, unknown> = {
      id,
      uid,
      type: entry.type,
      deviceName: entry.deviceName.slice(0, 60),
      createdAt: serverTimestamp(),
    };
    if (entry.trackId) payload.trackId = entry.trackId.slice(0, 64);
    if (entry.playlistId) payload.playlistId = entry.playlistId.slice(0, 128);
    if (entry.playlistName) payload.playlistName = entry.playlistName.slice(0, 80);

    await setDoc(doc(db, 'users', uid, 'activity', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePlaybackSyncInFirestore(
  uid: string,
  patch: {
    currentTrackId: string;
    positionSec: number;
    isPlaying: boolean;
    queueTrackIds: string[];
  }
): Promise<void> {
  const path = `users/${uid}/sync/state`;
  try {
    await updateDoc(doc(db, 'users', uid, 'sync', 'state'), {
      currentTrackId: patch.currentTrackId.slice(0, 64),
      positionSec: Math.max(0, Math.min(7200, Math.round(patch.positionSec))),
      isPlaying: patch.isPlaying,
      queueTrackIds: patch.queueTrackIds.slice(0, 100),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function transferDeviceInFirestore(
  uid: string,
  payload: {
    activeDeviceId: string;
    activeDeviceName: string;
    currentTrackId: string;
    positionSec: number;
    isPlaying: boolean;
  }
): Promise<void> {
  const path = `users/${uid}/sync/state`;
  try {
    await updateDoc(doc(db, 'users', uid, 'sync', 'state'), {
      activeDeviceId: sanitizeId(payload.activeDeviceId),
      activeDeviceName: payload.activeDeviceName.slice(0, 60),
      currentTrackId: payload.currentTrackId.slice(0, 64),
      positionSec: Math.max(0, Math.min(7200, Math.round(payload.positionSec))),
      isPlaying: payload.isPlaying,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateFidelityInFirestore(uid: string, fidelity: AudioFidelity): Promise<void> {
  const path = `users/${uid}/sync/state`;
  try {
    await updateDoc(doc(db, 'users', uid, 'sync', 'state'), {
      fidelity,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createPlaylistInFirestore(
  uid: string,
  playlist: Playlist
): Promise<void> {
  const id = sanitizeId(playlist.id);
  const path = `playlists/${id}`;
  try {
    await setDoc(doc(db, 'playlists', id), {
      id,
      ownerId: uid,
      ownerName: playlist.ownerName.slice(0, 60),
      ownerHandle: playlist.ownerHandle.slice(0, 40),
      name: playlist.name.slice(0, 80),
      description: playlist.description.slice(0, 240),
      coverUrl: playlist.coverUrl.slice(0, 512),
      trackIds: playlist.trackIds.slice(0, 100),
      isPublic: playlist.isPublic,
      ...(playlist.shareCode ? { shareCode: playlist.shareCode.slice(0, 24) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePlaylistTracksInFirestore(
  playlistId: string,
  trackIds: string[]
): Promise<void> {
  const id = sanitizeId(playlistId);
  const path = `playlists/${id}`;
  try {
    await updateDoc(doc(db, 'playlists', id), {
      trackIds: trackIds.slice(0, 100),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePlaylistInFirestore(playlistId: string): Promise<void> {
  const id = sanitizeId(playlistId);
  const path = `playlists/${id}`;
  try {
    await deleteDoc(doc(db, 'playlists', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function publishSharedPostInFirestore(
  uid: string,
  payload: {
    playlist: Playlist;
    note: string;
    authorName: string;
    authorHandle: string;
    authorAvatarUrl: string;
  }
): Promise<string> {
  const postId = sanitizeId(`post-${Date.now()}`);
  const shareCode =
    payload.playlist.shareCode ||
    `${payload.playlist.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const path = `sharedPosts/${postId}`;

  try {
    await setDoc(doc(db, 'sharedPosts', postId), {
      id: postId,
      shareCode,
      playlistId: sanitizeId(payload.playlist.id),
      playlistName: payload.playlist.name.slice(0, 80),
      playlistDescription: payload.playlist.description.slice(0, 240),
      coverUrl: payload.playlist.coverUrl.slice(0, 512),
      trackIds: payload.playlist.trackIds.slice(0, 100),
      note: payload.note.slice(0, 280),
      authorId: uid,
      authorName: payload.authorName.slice(0, 60),
      authorHandle: payload.authorHandle.slice(0, 40),
      authorAvatarUrl: payload.authorAvatarUrl.slice(0, 512),
      likesCount: 0,
      savesCount: 0,
      isPublished: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return shareCode;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleLikeSharedPostInFirestore(
  uid: string,
  postId: string,
  currentlyLiked: boolean,
  currentLikesCount: number
): Promise<void> {
  const cleanPostId = sanitizeId(postId);
  const path = `sharedPosts/${cleanPostId}`;
  try {
    const batch = writeBatch(db);
    const postRef = doc(db, 'sharedPosts', cleanPostId);
    const likeRef = doc(db, 'sharedPosts', cleanPostId, 'likes', uid);

    if (currentlyLiked) {
      batch.delete(likeRef);
      batch.update(postRef, {
        likesCount: Math.max(0, currentLikesCount - 1),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(likeRef, {
        uid,
        postId: cleanPostId,
        createdAt: serverTimestamp(),
      });
      batch.update(postRef, {
        likesCount: currentLikesCount + 1,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addCommentToSharedPostInFirestore(
  uid: string,
  postId: string,
  payload: { authorName: string; authorHandle: string; text: string }
): Promise<void> {
  const cleanPostId = sanitizeId(postId);
  const commentId = sanitizeId(`cmt-${Date.now()}`);
  const path = `sharedPosts/${cleanPostId}/comments/${commentId}`;
  try {
    await setDoc(doc(db, 'sharedPosts', cleanPostId, 'comments', commentId), {
      id: commentId,
      postId: cleanPostId,
      authorId: uid,
      authorName: payload.authorName.slice(0, 60),
      authorHandle: payload.authorHandle.slice(0, 40),
      text: payload.text.trim().slice(0, 240),
      isPublished: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function importSharedPostByCodeFromFirestore(
  shareCode: string
): Promise<SharedPlaylistPost | null> {
  const code = shareCode.trim().toUpperCase();
  const path = 'sharedPosts';
  try {
    const q = query(
      collection(db, 'sharedPosts'),
      where('isPublished', '==', true),
      where('shareCode', '==', code),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0].data();
    return {
      id: String(d.id || snap.docs[0].id),
      shareCode: String(d.shareCode),
      playlist: {
        id: String(d.playlistId || snap.docs[0].id),
        name: String(d.playlistName),
        description: String(d.playlistDescription || ''),
        coverUrl: String(d.coverUrl || COVER_ART.midnightVinyl),
        ownerName: String(d.authorName),
        ownerHandle: String(d.authorHandle),
        trackIds: Array.isArray(d.trackIds) ? d.trackIds.map(String) : [],
        isPublic: true,
        shareCode: String(d.shareCode),
        updatedAt: toIso(d.updatedAt),
      },
      note: String(d.note || ''),
      sharedBy: {
        name: String(d.authorName),
        handle: String(d.authorHandle),
        avatarUrl: String(d.authorAvatarUrl || COVER_ART.userAvatar),
      },
      likes: Number(d.likesCount || 0),
      savesCount: Number(d.savesCount || 0),
      comments: [],
      sharedAt: toIso(d.createdAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

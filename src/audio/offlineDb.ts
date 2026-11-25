import type { OfflineTrackRecord, Track } from '../types/music';

const DB_NAME = 'music-chill-offline-v1';
const DB_VERSION = 1;
const BLOB_STORE = 'audioBlobs';
const META_STORE = 'trackMeta';

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'trackId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllOfflineRecords(): Promise<OfflineTrackRecord[]> {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineTrackRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getOfflineAudioBlob(trackId: string): Promise<Blob | null> {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readonly');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.get(trackId);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveOfflineTrack(track: Track, blob: Blob): Promise<OfflineTrackRecord> {
  const db = await openOfflineDb();
  const record: OfflineTrackRecord = {
    trackId: track.id,
    sizeBytes: blob.size,
    downloadedAt: new Date().toISOString(),
    sampleRate: track.sampleRate,
    bitDepth: track.bitDepth,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    tx.objectStore(BLOB_STORE).put(blob, track.id);
    tx.objectStore(META_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return record;
}

export async function removeOfflineTrack(trackId: string): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    tx.objectStore(BLOB_STORE).delete(trackId);
    tx.objectStore(META_STORE).delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllOfflineTracks(): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    tx.objectStore(BLOB_STORE).clear();
    tx.objectStore(META_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

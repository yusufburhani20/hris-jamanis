export interface OfflineAttendance {
    id?: number;
    type: 'check-in' | 'check-out';
    latitude: number;
    longitude: number;
    photo_base64?: string;
    offline_device_time: string;
    is_mocked?: boolean;
    accuracy?: number;
}

const DB_NAME = 'hris_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'attendance_queue';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Gagal membuka database IndexedDB untuk absensi offline.'));
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

export async function addToOfflineQueue(item: Omit<OfflineAttendance, 'id'>): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(item);

        request.onsuccess = () => {
            resolve(request.result as number);
        };

        request.onerror = () => {
            reject(new Error('Gagal menyimpan absensi offline ke IndexedDB.'));
        };
    });
}

export async function getOfflineQueue(): Promise<OfflineAttendance[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result as OfflineAttendance[]);
        };

        request.onerror = () => {
            reject(new Error('Gagal memuat antrean absensi offline.'));
        };
    });
}

export async function deleteFromOfflineQueue(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(new Error(`Gagal menghapus item antrean offline dengan id ${id}.`));
        };
    });
}

export async function clearOfflineQueue(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(new Error('Gagal membersihkan antrean absensi offline.'));
        };
    });
}

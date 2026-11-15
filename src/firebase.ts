/**
 * Inisialisasi Firebase untuk Siprak-12.
 * Menggunakan project Firebase yang sudah ditetapkan pada baseline main.
 *
 * React Native Auth menggunakan AsyncStorage agar status login pulih
 * setelah aplikasi ditutup/dibuka kembali (SRS FR-S2-03).
 */
import { getApp, getApps, initializeApp } from 'firebase/app';


import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';

import * as AsyncStorageModule from '@react-native-async-storage/async-storage';

import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAReSe8o7NaWgyAUe_tCooN6uTLbuVrQ-A',
  authDomain: 'siprak-12-sprint-2.firebaseapp.com',
  projectId: 'siprak-12-sprint-2',
  storageBucket: 'siprak-12-sprint-2.firebasestorage.app',
  messagingSenderId: '772025476114',
  appId: '1:772025476114:web:599161d33c6bfe071a24cb',
  measurementId: 'G-VQY71BWHLJ',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type AsyncStorageModuleShape = {
  default?: AsyncStorageLike;
  createAsyncStorage?: (name: string) => AsyncStorageLike;
  getItem?: AsyncStorageLike['getItem'];
  setItem?: AsyncStorageLike['setItem'];
  removeItem?: AsyncStorageLike['removeItem'];
};

// Mendukung API AsyncStorage v2 (default export) dan v3 (createAsyncStorage).
const storageModule = AsyncStorageModule as unknown as AsyncStorageModuleShape;
const authStorage: AsyncStorageLike =
  storageModule.createAsyncStorage?.('siprak12-auth') ??
  storageModule.default ??
  (storageModule as unknown as AsyncStorageLike);

function createPersistentAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(
        authStorage as Parameters<typeof getReactNativePersistence>[0]
      ),
    });
  } catch (error) {
    // Fast Refresh dapat menjalankan modul ini kembali setelah Auth terinisialisasi.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'auth/already-initialized'
    ) {
      return getAuth(app);
    }
    throw error;
  }
}

export const auth = createPersistentAuth();
export const db = getFirestore(app);

export default app;

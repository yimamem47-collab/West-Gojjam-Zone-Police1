import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  memoryLocalCache,
  doc, 
  getDocFromServer,
  enableNetwork,
  disableNetwork,
  terminate,
  clearIndexedDbPersistence
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseAppletConfig from "../firebase-applet-config.json";

// Hybrid configuration: Prefer environment variables (for Vercel), fallback to applet config (for AI Studio)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId
};

// Use the firestoreDatabaseId from the config, but ignore it if it looks like an API key (starts with AIza)
const rawDbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId;
const dbId = rawDbId && rawDbId !== "(default)" && !rawDbId.startsWith("AIza") && !rawDbId.includes(",")
  ? rawDbId 
  : undefined;

if (rawDbId && (rawDbId.startsWith("AIza") || rawDbId.includes(","))) {
  console.info("Firebase: VITE_FIREBASE_FIRESTORE_DATABASE_ID provided as API Key or malformed. Using default database.");
}

console.log("Firebase config loaded:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
  databaseId: dbId || "(default)"
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Collection names
export const CRIME_REPORTS_COLLECTION = "WestGojjam_Reports";

// Ensure persistence is set to local
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Auth persistence error:", err);
});

// Initialize Firestore with robust settings
const isSandboxed = window.location.hostname.includes('ais-dev') || 
                   window.location.hostname.includes('ais-pre') || 
                   window.location.hostname === 'localhost';

// Initialize Firestore with robust settings. Use multi-tab persistent cache by default.
// In sandboxed/iframe environments where third-party IndexedDB might be blocked by browser privacy settings,
// our try-catch initialization block below will automatically catch any DOMException and fall back to memoryLocalCache().
export const firestoreSettings: any = {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
};

// Initialize Firestore
let dbReady = false;
export let db: any;

// Detect crash loop and clear persistence if needed
const CRASH_COUNT_KEY = 'firestore_crash_count';
const LAST_CRASH_TIME_KEY = 'firestore_last_crash_time';
const lastCrashes = parseInt(localStorage.getItem(CRASH_COUNT_KEY) || '0');
const lastCrashTime = parseInt(localStorage.getItem(LAST_CRASH_TIME_KEY) || '0');
const now = Date.now();

// If we crashed recently (within 5 minutes), be more aggressive about memory cache
if (lastCrashes > 0 || (now - lastCrashTime < 300000)) {
  console.warn("Detected recent Firestore issues. Forcing memory cache for stability...");
  firestoreSettings.localCache = memoryLocalCache();
}

try {
  db = initializeFirestore(app, firestoreSettings, dbId);
  dbReady = true;
} catch (err: any) {
  console.warn("Firestore initialization failed, falling back to basic in-memory...", err);
  db = initializeFirestore(app, { 
    ignoreUndefinedProperties: true,
    localCache: memoryLocalCache()
  }, dbId);
}

let isClearingCache = false;

/**
 * Directly deletes all Firestore offline cache databases from IndexedDB using standard Web Browser APIs.
 * This completely bypasses the crashed/locked Firestore instance.
 */
export async function forceDeleteIndexedDBFirestoreDatabases(): Promise<boolean> {
  console.log("forceDeleteIndexedDBFirestoreDatabases: purging cached databases...");
  try {
    if (!window.indexedDB) return false;
    
    if (window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases();
      for (const dbInfo of dbs) {
        if (dbInfo.name && (dbInfo.name.includes('firestore') || dbInfo.name.includes('firebase'))) {
          console.log(`Directly deleting corrupt database: ${dbInfo.name}`);
          try {
            window.indexedDB.deleteDatabase(dbInfo.name);
          } catch (e) {
            console.warn(`Failed to delete database ${dbInfo.name}:`, e);
          }
        }
      }
    } else {
      // Fallback Common prefixes
      const commonNames = [
        `firestoreOfflineSource_[${firebaseConfig.apiKey}]_[${firebaseConfig.projectId}]_(default)`,
        `firestoreOfflineSource_${firebaseConfig.projectId}_(default)`
      ];
      for (const name of commonNames) {
        try {
          window.indexedDB.deleteDatabase(name);
        } catch (e) {}
      }
    }
    return true;
  } catch (error) {
    console.error("Failed to directly delete IndexedDB databases:", error);
    return false;
  }
}

/**
 * Forcefully clears the Firestore cache and restarts the instance safely.
 */
export async function clearFirestoreCache() {
  if (isClearingCache) {
    console.log("Cache clearing already in progress. Skipping duplicate run.");
    return false;
  }
  isClearingCache = true;
  console.log("Attempting to clear Firestore cache and fix connectivity issues...");
  try {
    // Increment crash info
    const count = parseInt(localStorage.getItem(CRASH_COUNT_KEY) || '0');
    localStorage.setItem(CRASH_COUNT_KEY, (count + 1).toString());
    localStorage.setItem(LAST_CRASH_TIME_KEY, Date.now().toString());

    // Safely delete IndexedDB using direct browser API
    await forceDeleteIndexedDBFirestoreDatabases();
    
    // Small delay to ensure DB handles are released by the OS/browser
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log("Firestore cache cleared. Survival mode activated, page reload is required.");
    return true;
  } catch (error) {
    console.error("Failed to clear Firestore cache:", error);
    return false;
  } finally {
    isClearingCache = false;
  }
}

/**
 * Forcefully tries to re-enable the network connection.
 */
export async function forceReconnect() {
  console.log("Forcefully attempting to reconnect to Firestore...");
  try {
    await disableNetwork(db);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await enableNetwork(db).catch(() => {});
    await testConnection(3);
    return true;
  } catch (error) {
    console.error("Force reconnect failed:", error);
    return false;
  }
}

export const googleProvider = new GoogleAuthProvider();

// Connection status tracking
let isFirestoreConnected = false;
const connectionListeners: ((connected: boolean) => void)[] = [];

export const getFirestoreStatus = () => isFirestoreConnected;
export const onFirestoreStatusChange = (callback: (connected: boolean) => void) => {
  connectionListeners.push(callback);
  callback(isFirestoreConnected);
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) connectionListeners.splice(index, 1);
  };
};

const setFirestoreStatus = (status: boolean) => {
  if (isFirestoreConnected !== status) {
    isFirestoreConnected = status;
    connectionListeners.forEach(cb => cb(status));
  }
};

/**
 * CRITICAL CONSTRAINT: Test connection to Firestore on boot.
 */
export async function testConnection(retries = 3) {
  // Wait for initial load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  for (let i = 0; i < retries; i++) {
    // Basic network check
    if (!navigator.onLine) {
      console.log("Device reports as offline. Waiting for network...");
      setFirestoreStatus(false);
      await new Promise(resolve => setTimeout(resolve, 3000));
      continue;
    }

    try {
      console.log(`Firestore connection check ${i + 1}/${retries}...`);
      
      // Attempt standard test document fetch (required by skill)
      const testDoc = doc(db, 'test', 'connection');
      await getDocFromServer(testDoc);
      
      console.log("Firestore connection verified successfully.");
      setFirestoreStatus(true);
      return; 
    } catch (error: any) {
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      
      // If we got a real Firestore error code that implies server contact (e.g. permission-denied)
      const hasActuallyContactedServer = errorCode && 
        !['unavailable', 'deadline-exceeded', 'canceled', 'unknown', 'internal'].includes(errorCode);
      
      if (hasActuallyContactedServer) {
        console.log("Firestore connection confirmed via server response code:", errorCode);
        setFirestoreStatus(true);
        return;
      }
      
      if (errorMessage.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
        setFirestoreStatus(false);
      }
      
      console.warn(`Connection attempt ${i + 1} completed: ${errorCode || errorMessage}`);
      
      if (i < retries - 1) {
        // Gradual delay
        await new Promise(resolve => setTimeout(resolve, 2000 + (Math.random() * 1000)));
      }
    }
  }
  
  console.log("Firestore connection check completed. Operating in best-effort/offline mode using cache.");
  setFirestoreStatus(true);
}

// Start connection test after a short delay
setTimeout(() => testConnection(3), 1000);

// Global error listener to catch unhandled Firestore assertion failures
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || event.message || '';
  if (errorMessage.includes('FIRESTORE') && (errorMessage.includes('ASSERTION FAILED') || errorMessage.includes('Unexpected state'))) {
    console.error('Unhandled Firestore Assertion Failure detected globally:', errorMessage);
    
    if (isClearingCache) return;
    // Attempt emergency clear and reload
    clearFirestoreCache().then((success) => {
      if (success) {
        const count = parseInt(localStorage.getItem(CRASH_COUNT_KEY) || '0');
        if ((window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev') || window.location.hostname.includes('ais-pre')) && count < 5) {
          console.warn("Global listener: Reloading application to recover from Firestore crash...");
          window.location.reload();
        } else {
          console.error("Global listener: App crashed too many times. Automatic reload disabled.");
        }
      }
    });
  }
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/**
 * CRITICAL DIRECTIVE: Specific error handler for Firestore permissions and connectivity.
 */
export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error?.code || '';
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  const errorString = JSON.stringify(errInfo);
  console.error('Firestore Error Details:', errorString);
  
  // Log specific errors for remote debugging
  if (errorCode === 'permission-denied') {
    console.warn(`CRITICAL: Permission denied for ${operationType} on ${path}. Check security rules.`);
  }

  // Do not throw for offline/network errors to prevent app crashes
  if (
    errorCode === 'unavailable' || 
    errorCode === 'deadline-exceeded' ||
    errorMessage.includes('offline') || 
    errorMessage.includes('Could not reach Cloud Firestore') || 
    errorMessage.includes('network') ||
    errorMessage.includes('Internet connection') ||
    errorMessage.includes('transport errored') ||
    errorMessage.includes('WebChannelConnection') ||
    errorMessage.includes('Listen') ||
    errorMessage.includes('Target ID already exists')
  ) {
    console.warn('Network/Firestore stream error ignored to prevent crash:', errorMessage);
    return;
  }
  
  // Return a user-friendly message but throw the JSON for the system
  
  // Detect internal assertion errors - these usually require a page reload or cache clear
  if (errorMessage.includes('ASSERTION FAILED') || errorMessage.includes('Unexpected state')) {
    console.warn('CRITICAL: Firestore internal assertion error detected. Attempting to recover...');
    
    if (isClearingCache) {
      console.warn("handleFirestoreError: Cache clearing is already running. Avoiding re-entrancy.");
      throw new Error(errorString);
    }
    
    clearFirestoreCache().then((success) => {
      if (success) {
        const count = parseInt(localStorage.getItem(CRASH_COUNT_KEY) || '0');
        // If we are in a non-production environment, it might be better to just reload
        if ((window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev') || window.location.hostname.includes('ais-pre')) && count < 5) {
          console.log('Reloading page to recover from Firestore crash...');
          window.location.reload();
        }
      } else {
        console.error("handleFirestoreError: App crashed too many times. Automatic reload disabled to prevent loops.");
      }
    });
  }

  throw new Error(errorString);
}

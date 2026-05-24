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

// Use memory cache by default in sandboxed environments to prevent IndexedDB corruption in iframes
export const firestoreSettings: any = {
  localCache: isSandboxed ? memoryLocalCache() : persistentLocalCache({}),
  experimentalForceLongPolling: true,
  useFetchStreams: false,
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

/**
 * Forcefully clears the Firestore cache and restarts the instance.
 */
export async function clearFirestoreCache() {
  console.log("Attempting to clear Firestore cache and fix connectivity issues...");
  try {
    // Increment crash info
    const count = parseInt(localStorage.getItem(CRASH_COUNT_KEY) || '0');
    localStorage.setItem(CRASH_COUNT_KEY, (count + 1).toString());
    localStorage.setItem(LAST_CRASH_TIME_KEY, Date.now().toString());

    await terminate(db).catch(() => {});
    await clearIndexedDbPersistence(db).catch(() => {});
    
    // Small delay to ensure DB handles are released
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Switch to memory cache for survival
    const safeSettings = { ...firestoreSettings, localCache: memoryLocalCache() };
    db = initializeFirestore(app, safeSettings, dbId);
    console.log("Firestore cache cleared and instance restarted with memory cache.");
    
    return true;
  } catch (error) {
    console.error("Failed to clear Firestore cache:", error);
    return false;
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
export async function testConnection(retries = 30) {
  // Wait for initial load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  for (let i = 0; i < retries; i++) {
    // Basic network check
    if (!navigator.onLine) {
      console.log("Device reports as offline. Waiting for network...");
      setFirestoreStatus(false);
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }

    try {
      console.log(`Firestore connection check ${i + 1}/${retries}...`);
      
      // Attempt to communicate with the server
      if (dbReady) {
        await enableNetwork(db).catch(() => {});
      }
      
      // Use getDocFromServer to force a server round-trip.
      const testDoc = doc(db, '_connectivity_test_', 'ping');
      
      const fetchPromise = getDocFromServer(testDoc);
      
      // Increased handshake timeout to 15s to be safer
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Handshake timeout')), 15000)
      );

      await Promise.race([fetchPromise, timeoutPromise]);
      
      console.log("Firestore connection verified.");
      setFirestoreStatus(true);
      return; 
    } catch (error: any) {
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      
      // If we got a real Firestore error code that implies server contact
      const hasActuallyContactedServer = errorCode && 
        !['unavailable', 'deadline-exceeded', 'canceled', 'unknown', 'internal'].includes(errorCode) &&
        !errorMessage.includes('Handshake timeout');
      
      if (hasActuallyContactedServer) {
        console.log("Firestore connection confirmed via server response code:", errorCode);
        setFirestoreStatus(true);
        return;
      }
      
      console.warn(`Connection attempt ${i + 1} failed: ${errorCode || errorMessage}`);
      
      // Network recycling on every 3rd failure
      if (i > 0 && i % 3 === 0) {
        console.log("Recycling network connection stack...");
        await disableNetwork(db).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 2000));
        await enableNetwork(db).catch(() => {});
      }

      // Gradual backoff with jitter
      const delay = Math.min(1000 * (i + 1), 20000) + (Math.random() * 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error("Firestore connection could not be verified. Operating in best-effort/offline mode.");
  setFirestoreStatus(false);
}

// Start connection test after a short delay
setTimeout(() => testConnection(), 1000);

// Global error listener to catch unhandled Firestore assertion failures
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || event.message || '';
  if (errorMessage.includes('FIRESTORE') && (errorMessage.includes('ASSERTION FAILED') || errorMessage.includes('Unexpected state'))) {
    console.error('Unhandled Firestore Assertion Failure detected globally:', errorMessage);
    
    // Attempt emergency clear and reload
    clearFirestoreCache().then(() => {
       const count = parseInt(localStorage.getItem(CRASH_COUNT_KEY) || '0');
       // Only reload if we haven't reloaded too many times recently
       if ((window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev')) && count < 5) {
         window.location.reload();
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
    errorMessage.includes('Listen')
  ) {
    console.warn('Network/Firestore stream error ignored to prevent crash:', errorMessage);
    return;
  }
  
  // Return a user-friendly message but throw the JSON for the system
  
  // Detect internal assertion errors - these usually require a page reload or cache clear
  if (errorMessage.includes('ASSERTION FAILED') || errorMessage.includes('Unexpected state')) {
    console.warn('CRITICAL: Firestore internal assertion error detected. Attempting to recover...');
    
    clearFirestoreCache().then(() => {
      const count = parseInt(localStorage.getItem(CRASH_COUNT_KEY) || '0');
      // If we are in a non-production environment, it might be better to just reload
      if ((window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev')) && count < 5) {
        console.log('Reloading page to recover from Firestore crash...');
        window.location.reload();
      }
    });
  }

  throw new Error(errorString);
}

const admin = require('firebase-admin');
const { loadEnv } = require('./env');

const env = loadEnv();

let isInitialized = false;

if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
  try {
    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    isInitialized = true;
  } catch (err) {
    // We log but do not crash the process to allow running with dummy values in dev
    console.error('[Firebase Config] Failed to initialize Firebase Admin SDK:', err);
  }
} else if (env.NODE_ENV === 'production') {
  console.error('[Firebase Config] Firebase Admin credentials are required in production environment.');
} else if (env.NODE_ENV !== 'test') {
  // In development, we warn but do not throw
  console.warn('[Firebase Config] Firebase Admin credentials are not set — Firebase OAuth calls will fail in runtime.');
}

async function verifyFirebaseToken(idToken) {
  if (!isInitialized) {
    throw new Error('Firebase Admin SDK is not initialized. Check your environment variables.');
  }
  return admin.auth().verifyIdToken(idToken);
}

module.exports = {
  verifyFirebaseToken,
  isFirebaseInitialized: () => isInitialized,
};

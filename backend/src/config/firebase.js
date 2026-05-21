const admin = require("firebase-admin");
const { loadEnv } = require("./env");

const env = loadEnv();

let isInitialized = false;

if (
  env.FIREBASE_PROJECT_ID &&
  env.FIREBASE_CLIENT_EMAIL &&
  env.FIREBASE_PRIVATE_KEY
) {
  try {
    let privateKey = env.FIREBASE_PRIVATE_KEY;

    // 1. Si ton parseur d'environnement a gardé des guillemets simples ou doubles autour de la chaîne, on les vire
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }

    // 2. On remplace les \n textuels par de vrais sauts de ligne pour OpenSSL
    privateKey = privateKey.replace(/\\n/g, "\n");

    // 3. On initialise proprement
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    isInitialized = true;
    console.log(
      "[Firebase Config] Firebase Admin SDK initialized successfully !",
    );
  } catch (err) {
    // On log l'erreur sans crash le process en dev
    console.error(
      "[Firebase Config] Failed to initialize Firebase Admin SDK:",
      err,
    );
  }
} else if (env.NODE_ENV === "production") {
  console.error(
    "[Firebase Config] Firebase Admin credentials are required in production environment.",
  );
} else if (env.NODE_ENV !== "test") {
  // In development, we warn but do not throw
  console.warn(
    "[Firebase Config] Firebase Admin credentials are not set — Firebase OAuth calls will fail in runtime.",
  );
}

/**
 * Decode a Firebase ID token without signature verification.
 * Only used as a development fallback when Admin SDK is not initialised.
 */
function decodeTokenUnsafe(idToken) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  return payload;
}

async function verifyFirebaseToken(idToken) {
  if (isInitialized) {
    return admin.auth().verifyIdToken(idToken);
  }

  // Development fallback: decode without verification
  if (env.NODE_ENV !== 'production') {
    console.warn('[Firebase Config] Admin SDK not initialised — decoding token WITHOUT signature verification (dev only).');
    const payload = decodeTokenUnsafe(idToken);
    // Return a shape compatible with admin.auth().verifyIdToken()
    return {
      uid: payload.user_id || payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      email_verified: payload.email_verified,
    };
  }

  throw new Error(
    "Firebase Admin SDK is not initialized. Check your environment variables.",
  );
}

module.exports = {
  verifyFirebaseToken,
  isFirebaseInitialized: () => isInitialized,
};

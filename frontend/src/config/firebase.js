import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-auth-domain',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock-storage-bucket',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'mock-messaging-sender-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'mock-app-id',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'mock-measurement-id',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const githubProvider = new GithubAuthProvider();

// Sign in with Google Popup
export const signInWithGooglePopup = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    return { user, idToken };
  } catch (error) {
    console.error('Error during Google sign-in:', error);
    throw error;
  }
};

// Sign in with GitHub Popup
export const signInWithGithubPopup = async () => {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    return { user, idToken };
  } catch (error) {
    console.error('Error during GitHub sign-in:', error);
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error during sign-out:', error);
    throw error;
  }
};

export { auth, googleProvider, githubProvider };

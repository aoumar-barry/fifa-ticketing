import { signInWithGooglePopup, signInWithGithubPopup, signOutUser } from '../../config/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

const mockUser = {
  uid: 'mock-uid-456',
  email: 'test@example.com',
  getIdToken: jest.fn().mockResolvedValue('mock-id-token-123'),
};

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    setCustomParameters: jest.fn(),
  })),
  GithubAuthProvider: jest.fn().mockImplementation(() => ({})),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

describe('Firebase Client SDK Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('signInWithGooglePopup returns user and idToken on success', async () => {
    signInWithPopup.mockResolvedValueOnce({ user: mockUser });
    const result = await signInWithGooglePopup();
    expect(signInWithPopup).toHaveBeenCalled();
    expect(result.idToken).toBe('mock-id-token-123');
    expect(result.user.uid).toBe('mock-uid-456');
  });

  test('signInWithGooglePopup propagates errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    signInWithPopup.mockRejectedValueOnce(new Error('Google Popup Error'));
    await expect(signInWithGooglePopup()).rejects.toThrow('Google Popup Error');
    consoleErrorSpy.mockRestore();
  });

  test('signInWithGithubPopup returns user and idToken on success', async () => {
    signInWithPopup.mockResolvedValueOnce({ user: mockUser });
    const result = await signInWithGithubPopup();
    expect(signInWithPopup).toHaveBeenCalled();
    expect(result.idToken).toBe('mock-id-token-123');
    expect(result.user.uid).toBe('mock-uid-456');
  });

  test('signInWithGithubPopup propagates errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    signInWithPopup.mockRejectedValueOnce(new Error('GitHub Popup Error'));
    await expect(signInWithGithubPopup()).rejects.toThrow('GitHub Popup Error');
    consoleErrorSpy.mockRestore();
  });

  test('signOutUser calls signOut on success', async () => {
    signOut.mockResolvedValueOnce();
    await signOutUser();
    expect(signOut).toHaveBeenCalled();
  });

  test('signOutUser propagates errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    signOut.mockRejectedValueOnce(new Error('SignOut Error'));
    await expect(signOutUser()).rejects.toThrow('SignOut Error');
    consoleErrorSpy.mockRestore();
  });
});

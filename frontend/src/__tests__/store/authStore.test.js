import { useAuthStore } from '../../store/authStore';
import * as authService from '../../services/authService';

jest.mock('../../services/authService');

const mockToken = 'header.' + window.btoa(JSON.stringify({ userId: 'user-123', email: 'test@example.com', role: 'user' })) + '.signature';

describe('Auth Store (Zustand)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  test('initial state is unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  test('login local updates state on success', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    authService.loginLocal.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'access-token-xyz',
    });

    await useAuthStore.getState().login('test@example.com', 'password123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token-xyz');
    expect(state.error).toBeNull();
  });

  test('login local sets error on failure', async () => {
    authService.loginLocal.mockRejectedValueOnce(new Error('Invalid credentials'));

    await expect(useAuthStore.getState().login('test@example.com', 'password123')).rejects.toThrow('Invalid credentials');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.error).toBe('Invalid credentials');
  });

  test('loginWithFirebase updates state on success', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    authService.loginFirebase.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'access-token-xyz',
    });

    await useAuthStore.getState().loginWithFirebase('firebase-id-token');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token-xyz');
  });

  test('register updates state on success', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    authService.registerLocal.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'access-token-xyz',
    });

    await useAuthStore.getState().register('test@example.com', 'password123', 'John', 'Doe', '123456');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  test('logout clears store state', async () => {
    useAuthStore.setState({
      user: { id: 'user-123' },
      accessToken: 'access-token-xyz',
      isAuthenticated: true,
    });

    authService.logout.mockResolvedValueOnce({ success: true });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  test('checkAuth decodes access token and populates user info', async () => {
    authService.refreshAccessToken.mockResolvedValueOnce({
      accessToken: mockToken,
    });

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe(mockToken);
    expect(state.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });
  });

  test('checkAuth handles failure silently and clears state', async () => {
    useAuthStore.setState({
      user: { id: 'user-123' },
      accessToken: 'old-access-token',
      isAuthenticated: true,
    });

    authService.refreshAccessToken.mockRejectedValueOnce(new Error('Session expired'));

    const result = await useAuthStore.getState().checkAuth();

    expect(result).toBeNull();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });
});

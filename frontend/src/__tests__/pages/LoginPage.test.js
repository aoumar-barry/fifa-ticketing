import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';
import { useAuthStore } from '../../store/authStore';
import { signInWithGooglePopup, signInWithGithubPopup } from '../../config/firebase';

// Mock stores
jest.mock('../../store/authStore');

// Mock firebase popups
jest.mock('../../config/firebase', () => ({
  signInWithGooglePopup: jest.fn(),
  signInWithGithubPopup: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage Component', () => {
  const mockLogin = jest.fn();
  const mockLoginWithFirebase = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.mockReturnValue({
      login: mockLogin,
      loginWithFirebase: mockLoginWithFirebase,
      isLoading: false,
      error: null,
    });
  });

  test('renders form fields and social buttons', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
  });

  test('submits local login form with inputs', async () => {
    mockLogin.mockResolvedValueOnce({});
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/adresse e-mail/i), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('shows validation error if local form submitted with empty fields', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(screen.getByText(/veuillez remplir tous les champs/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('shows error message if store login failed', () => {
    useAuthStore.mockReturnValue({
      login: mockLogin,
      loginWithFirebase: mockLoginWithFirebase,
      isLoading: false,
      error: 'Invalid credentials',
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });

  test('triggers Google login and processes token', async () => {
    signInWithGooglePopup.mockResolvedValueOnce({ idToken: 'google-token-123' });
    mockLoginWithFirebase.mockResolvedValueOnce({});

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /google/i }));

    await waitFor(() => {
      expect(signInWithGooglePopup).toHaveBeenCalled();
      expect(mockLoginWithFirebase).toHaveBeenCalledWith('google-token-123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('triggers GitHub login and processes token', async () => {
    signInWithGithubPopup.mockResolvedValueOnce({ idToken: 'github-token-456' });
    mockLoginWithFirebase.mockResolvedValueOnce({});

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /github/i }));

    await waitFor(() => {
      expect(signInWithGithubPopup).toHaveBeenCalled();
      expect(mockLoginWithFirebase).toHaveBeenCalledWith('github-token-456');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});

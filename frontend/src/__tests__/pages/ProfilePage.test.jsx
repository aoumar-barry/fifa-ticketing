import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../../pages/ProfilePage';
import { useAuthStore } from '../../store/authStore';
import { fetchUserProfile, updateUserProfile } from '../../services/userService';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../store/authStore');
jest.mock('../../services/userService');

describe('ProfilePage Component', () => {
  const mockSetUser = jest.fn();
  const mockLogout = jest.fn();
  const mockUser = { id: 'u1', email: 'test@fifa.com', role: 'user' };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
      logout: mockLogout,
    });
    fetchUserProfile.mockResolvedValue({
      email: 'test@fifa.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      phone: '+33612345678',
    });
  });

  test('renders loading state on mount', async () => {
    // delay resolution to test skeleton
    fetchUserProfile.mockReturnValueOnce(new Promise(() => {}));

    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('profile-loading')).toBeInTheDocument();
  });

  test('fetches and populates profile on mount', async () => {
    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(fetchUserProfile).toHaveBeenCalled();
    });

    const emailInput = screen.getByLabelText(/adresse email/i);
    expect(emailInput).toBeDisabled();
    expect(emailInput.value).toBe('test@fifa.com');
    expect(screen.getByLabelText(/prénom/i).value).toBe('Jean');
    expect(screen.getByLabelText(/^nom$/i).value).toBe('Dupont');
    expect(screen.getByLabelText(/numéro de téléphone/i).value).toBe('+33612345678');
  });

  test('displays errors when required fields are empty', async () => {
    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText(/prénom/i).value).toBe('Jean'));

    const firstNameInput = screen.getByLabelText(/prénom/i);
    const lastNameInput = screen.getByLabelText(/^nom$/i);
    const submitBtn = screen.getByRole('button', { name: /enregistrer les modifications/i });

    // Empty first name
    fireEvent.change(firstNameInput, { target: { value: '' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/le prénom est requis/i)).toBeInTheDocument();

    // Reset first name, empty last name
    fireEvent.change(firstNameInput, { target: { value: 'Jean' } });
    fireEvent.change(lastNameInput, { target: { value: '' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/le nom est requis/i)).toBeInTheDocument();
  });

  test('submits updated profile successfully', async () => {
    updateUserProfile.mockResolvedValueOnce({
      firstName: 'Marc',
      lastName: 'Durand',
      phone: '+33600000000',
    });

    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText(/prénom/i).value).toBe('Jean'));

    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'Marc' } });
    fireEvent.change(screen.getByLabelText(/^nom$/i), { target: { value: 'Durand' } });
    fireEvent.change(screen.getByLabelText(/numéro de téléphone/i), { target: { value: '+33600000000' } });

    fireEvent.click(screen.getByRole('button', { name: /enregistrer les modifications/i }));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith({
        firstName: 'Marc',
        lastName: 'Durand',
        phone: '+33600000000',
      });
      expect(mockSetUser).toHaveBeenCalledWith({
        id: 'u1',
        email: 'test@fifa.com',
        role: 'user',
        firstName: 'Marc',
        lastName: 'Durand',
        phone: '+33600000000',
      });
      expect(screen.getByText(/profil mis à jour avec succès/i)).toBeInTheDocument();
    });
  });

  test('displays error message from API if update fails', async () => {
    updateUserProfile.mockRejectedValueOnce(new Error('Erreur de serveur'));

    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText(/prénom/i).value).toBe('Jean'));

    fireEvent.click(screen.getByRole('button', { name: /enregistrer les modifications/i }));

    await waitFor(() => {
      expect(screen.getByText('Erreur de serveur')).toBeInTheDocument();
    });
  });

  test('navigates back to catalogue on button click', async () => {
    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText(/prénom/i).value).toBe('Jean'));

    const backBtn = screen.getByRole('button', { name: /retour au catalogue/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

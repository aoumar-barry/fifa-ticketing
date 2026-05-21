import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../../pages/RegisterPage';
import { useAuthStore } from '../../store/authStore';

// Mock store
jest.mock('../../store/authStore');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('RegisterPage Component', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: null,
    });
  });

  test('renders form fields', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/^prénom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nom \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/téléphone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mot de passe \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirmer le mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /s'inscrire/i })).toBeInTheDocument();
  });

  test('submits form with valid values', async () => {
    mockRegister.mockResolvedValueOnce({});
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/^prénom/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/^nom \*/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i), { target: { value: 'john.doe@test.com' } });
    fireEvent.change(screen.getByLabelText(/téléphone/i), { target: { value: '123456789' } });
    fireEvent.change(screen.getByLabelText(/^mot de passe \*/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/^confirmer le mot de passe/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'john.doe@test.com',
        'password123',
        'John',
        'Doe',
        '123456789'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('shows validation error for empty fields', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));

    expect(screen.getByText(/veuillez remplir tous les champs obligatoires/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('shows validation error for short password', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/^prénom/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/^nom \*/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i), { target: { value: 'john.doe@test.com' } });
    fireEvent.change(screen.getByLabelText(/^mot de passe \*/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^confirmer le mot de passe/i), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));

    expect(screen.getByText(/le mot de passe doit comporter au moins 8 caractères/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('shows validation error for mismatched passwords', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/^prénom/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/^nom \*/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i), { target: { value: 'john.doe@test.com' } });
    fireEvent.change(screen.getByLabelText(/^mot de passe \*/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/^confirmer le mot de passe/i), { target: { value: 'different123' } });

    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));

    expect(screen.getByText(/les mots de passe ne correspondent pas/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('shows validation error for invalid email format', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/^prénom/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/^nom \*/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i), { target: { value: 'invalid-email@domain' } });
    fireEvent.change(screen.getByLabelText(/^mot de passe \*/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/^confirmer le mot de passe/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));

    expect(screen.getByText(/veuillez entrer une adresse e-mail valide/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../presentation/pages/LoginPage';

const login = vi.hoisted(() => ({ loading: false, error: null as string | null, loginWithEmail: vi.fn(), loginWithGoogle: vi.fn(), clearError: vi.fn() }));
vi.mock('@auth/presentation/hooks', () => ({ useLogin: () => login }));

beforeEach(() => { vi.clearAllMocks(); login.error = null; });
const page = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);

describe('LoginPage form errors', () => {
  it('marks email and password as required', () => {
    page();
    for (const name of [/Email address/, /Password/]) {
      const input = screen.getByLabelText(name);
      expect(input).toBeRequired();
      expect(document.querySelector(`label[for="${input.id}"]`)).toHaveTextContent('*');
    }
  });
  it('focuses the empty email, outlines it and shows the message under it', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const email = screen.getByLabelText(/Email address/);
    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('email-error')).toHaveTextContent('Enter your email address');
    expect(screen.getByLabelText(/Password/)).toHaveAttribute('aria-invalid', 'true');
    expect(login.loginWithEmail).not.toHaveBeenCalled();
    fireEvent.change(email, { target: { value: 'a@b.co' } });
    expect(email).not.toHaveAttribute('aria-invalid');
  });
  it('focuses the password when only it is missing', async () => {
    page();
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const password = screen.getByLabelText(/Password/);
    await waitFor(() => expect(document.activeElement).toBe(password));
    expect(document.getElementById('password-error')).toHaveTextContent('Enter your password');
  });
  it('shows a sign-in refusal in the banner at the top', () => {
    login.error = 'Invalid login credentials';
    page();
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('Invalid login credentials');
    expect(banner).toHaveAttribute('data-form-error');
  });
});

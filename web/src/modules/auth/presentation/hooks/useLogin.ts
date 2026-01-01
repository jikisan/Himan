import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SupabaseAuthRepository } from '../../infrastructure/api';

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const repository = useMemo(() => new SupabaseAuthRepository(), []);

  const loginWithEmail = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      await repository.signInWithEmail({ email, password });
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);

    try {
      await repository.signInWithGoogle();
      // OAuth redirects automatically, no need to navigate
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return {
    loading,
    error,
    loginWithEmail,
    loginWithGoogle,
    clearError,
  };
};

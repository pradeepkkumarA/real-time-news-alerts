import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ mode }) {
  const { login, register } = useAuth();
  const isLogin = mode === 'login';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-red-600 font-bold text-white">N</div>
          <h1 className="text-xl font-bold">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p className="text-sm text-slate-500">Real-time news alerts, tailored to you.</p>
        </div>

        {!isLogin && (
          <input className="input" placeholder="Name" value={form.name} onChange={set('name')} required autoComplete="name" />
        )}
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={set('email')} required autoComplete="email" />
        <input
          className="input"
          type="password"
          placeholder="Password (min 6 characters)"
          value={form.password}
          onChange={set('password')}
          required
          minLength={6}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Sign up'}
        </button>

        <p className="text-center text-sm text-slate-500">
          {isLogin ? "Don't have an account?" : 'Already registered?'}{' '}
          <Link className="font-medium text-red-600 hover:underline" to={isLogin ? '/register' : '/login'}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </Link>
        </p>
      </form>
    </div>
  );
}

// src/pages/Login.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Auth } from '../lib/api';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Auth.login(email, password);
      nav('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] grid place-items-center p-4">
      <form
        onSubmit={submit}
        className={[
          'w-full max-w-md rounded-2xl p-5',
          // light card
          'bg-white border border-slate-200',
          // dark card
          'dark:bg-black/30 dark:border-white/10',
        ].join(' ')}
      >
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
          Login
        </h2>

        <label
          htmlFor="email"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Email
        </label>
        <input
          id="email"
          className={[
            'mt-1 w-full rounded-xl px-3 py-2',
            // light input
            'bg-white border border-slate-200 text-slate-800',
            // dark input
            'dark:bg-white/10 dark:border-white/10 dark:text-slate-100',
          ].join(' ')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
        />

        <label
          htmlFor="password"
          className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          className={[
            'mt-1 w-full rounded-xl px-3 py-2',
            // light input
            'bg-white border border-slate-200 text-slate-800',
            // dark input
            'dark:bg-white/10 dark:border-white/10 dark:text-slate-100',
          ].join(' ')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          className={[
            'mt-4 w-full px-3 py-2 rounded-xl text-sm transition-colors',
            // light button
            'bg-slate-900 text-white hover:bg-black disabled:opacity-60',
            // dark button
            'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
          ].join(' ')}
        >
          {loading ? 'Signing in…' : 'Login'}
        </button>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          No account?{' '}
          <Link
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            to="/register"
          >
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}

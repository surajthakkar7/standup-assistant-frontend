// src/pages/Register.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Auth } from '../lib/api';

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Auth.register(name, email, password);
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
          Create account
        </h2>

        <label
          htmlFor="name"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Name
        </label>
        <input
          id="name"
          className={[
            'mt-1 w-full rounded-xl px-3 py-2',
            'bg-white border border-slate-200 text-slate-800',
            'dark:bg-white/10 dark:border-white/10 dark:text-slate-100',
          ].join(' ')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />

        <label
          htmlFor="email"
          className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Email
        </label>
        <input
          id="email"
          className={[
            'mt-1 w-full rounded-xl px-3 py-2',
            'bg-white border border-slate-200 text-slate-800',
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
            'bg-white border border-slate-200 text-slate-800',
            'dark:bg-white/10 dark:border-white/10 dark:text-slate-100',
          ].join(' ')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading}
          className={[
            'mt-4 w-full px-3 py-2 rounded-xl text-sm transition-colors',
            'bg-slate-900 text-white hover:bg-black disabled:opacity-60',
            'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
          ].join(' ')}
        >
          {loading ? 'Creating…' : 'Register'}
        </button>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Have an account?{' '}
          <Link
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            to="/login"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

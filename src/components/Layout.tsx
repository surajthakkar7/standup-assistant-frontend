// src/layouts/Layout.tsx
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Auth } from '../lib/api';
import { userName } from '../lib/auth';
import { useEffect, useState, useCallback } from 'react';

/**
 * Tailwind config reminder:
 * module.exports = { darkMode: 'class', ... }
 */

// --- theme helpers ---
type Theme = 'dark' | 'light';

// Default to LIGHT first, user can switch to dark
function getStoredTheme(): Theme {
  const saved = localStorage.getItem('theme') as Theme | null;
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light';
}
function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  localStorage.setItem('theme', t);
}

export default function Layout() {
  const nav = useNavigate();
  const loc = useLocation();

  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  // active state works for exact or prefix (e.g., /insights/sub)
  const isActive = useCallback(
    (to: string) => loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to)),
    [loc.pathname]
  );

  const basePill =
    'px-3 py-2 rounded-xl transition-colors block w-full text-left md:text-center';
  const pillLight = 'hover:bg-slate-900/5 text-slate-700';
  const pillDark = 'dark:hover:bg-white/5 dark:text-slate-100';

  const NavLink = ({
    to,
    label,
    onClick,
  }: {
    to: string;
    label: string;
    onClick?: () => void;
  }) => (
    <Link
      to={to}
      onClick={onClick}
      className={[
        basePill,
        pillLight,
        pillDark,
        isActive(to) ? 'bg-slate-900/5 dark:bg-white/10' : '',
      ].join(' ')}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* Sticky nav for mobile friendliness */}
      <header className="sticky top-0 z-40">
        <nav
          className={[
            'mx-auto max-w-6xl px-4 py-3 mb-4',
            'rounded-2xl',
            'flex items-center justify-between',
            // light bar
            'bg-white/80 border border-slate-200 backdrop-blur supports-[backdrop-filter]:bg-white/60',
            // dark bar
            'dark:bg-black/30 dark:border-white/10',
          ].join(' ')}
          aria-label="Primary"
        >
          {/* Brand */}
          <div className="flex items-center gap-2">
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-100"
              aria-label="Toggle menu"
              aria-controls="mobile-menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {/* Hamburger / Close */}
              {!mobileOpen ? (
                // hamburger
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" role="img">
                  <path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z" />
                </svg>
              ) : (
                // X
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" role="img">
                  <path d="M18.3 5.71 12 12.01 5.7 5.7 4.29 7.11 10.59 13.4l-6.3 6.3 1.41 1.41 6.3-6.3 6.31 6.31 1.41-1.41-6.31-6.31 6.31-6.3z" />
                </svg>
              )}
            </button>
            <div className="text-lg font-bold tracking-wide select-none">Standup Assistant</div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <NavLink to="/" label="Dashboard" />
            <NavLink to="/team" label="Team" />
            <NavLink to="/insights" label="Insights" />
          </div>

          {/* Right controls */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme toggle */}
            <button
              className={[
                'px-3 py-2 rounded-xl text-sm transition-colors',
                'bg-slate-100 hover:bg-slate-200 text-slate-800',
                'dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-100',
              ].join(' ')}
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>

            <span className="hidden sm:inline text-slate-600 dark:text-slate-200">
              {userName()}
            </span>

            <button
              className={[
                'px-3 py-2 rounded-xl text-sm transition-colors',
                'bg-slate-900 text-white hover:bg-black',
                'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
              ].join(' ')}
              onClick={() => {
                Auth.logout();
                nav('/login');
              }}
            >
              Logout
            </button>
          </div>
        </nav>

        {/* Mobile menu panel */}
        <div
          id="mobile-menu"
          className={[
            'mx-auto max-w-6xl px-4',
            mobileOpen ? 'block' : 'hidden',
            'md:hidden',
          ].join(' ')}
        >
          <div
            className={[
              'rounded-2xl mb-4 p-3',
              'bg-white border border-slate-200',
              'dark:bg-black/30 dark:border-white/10',
              'space-y-2',
            ].join(' ')}
          >
            <NavLink to="/" label="Dashboard" onClick={() => setMobileOpen(false)} />
            <NavLink to="/team" label="Team" onClick={() => setMobileOpen(false)} />
            <NavLink to="/insights" label="Insights" onClick={() => setMobileOpen(false)} />

            <div className="h-px bg-slate-200 dark:bg-white/10 my-2" />

            <button
              className={[
                'w-full px-3 py-2 rounded-xl text-sm transition-colors',
                'bg-slate-100 hover:bg-slate-200 text-slate-800',
                'dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-100',
              ].join(' ')}
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-200 truncate pr-2">
                {userName()}
              </span>
              <button
                className={[
                  'px-3 py-2 rounded-xl text-sm transition-colors',
                  'bg-slate-900 text-white hover:bg-black',
                  'dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
                ].join(' ')}
                onClick={() => {
                  Auth.logout();
                  nav('/login');
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
}

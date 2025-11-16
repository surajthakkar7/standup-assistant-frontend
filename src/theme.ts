// src/theme.ts
export function getStoredTheme(): 'dark'|'light' {
  return (localStorage.getItem('theme') as any) || 'dark';
}
export function applyTheme(t: 'dark'|'light') {
  const root = document.documentElement;
  if (t === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  localStorage.setItem('theme', t);
}

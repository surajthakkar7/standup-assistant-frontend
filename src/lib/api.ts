// src/lib/api.ts
import { toast } from 'react-toastify';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function handleError(err: unknown): never {
  if (err instanceof Response) throw new Error(`HTTP ${err.status}`);
  if (err instanceof Error) throw err;
  throw new Error('Unexpected error');
}

async function request(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  try {
    const res = await fetch(`${BASE}${path}`, { ...opts, headers });

    // Some endpoints (204/no body) — avoid .json() throwing
    const text = await res.text();

    if (!res.ok) {
      let message = text || `HTTP ${res.status}`;
      try {
        const obj = text ? JSON.parse(text) : null;
        message = (obj && obj.message) || message;
      } catch {
        // ignore JSON parse error
      }

      // Optional auto-logout on 401
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('me');
      }

      toast.error(message);
      throw new Error(message);
    }

    const ct = res.headers.get('content-type') || '';
    const data =
      ct.includes('application/json') ? (text ? JSON.parse(text) : {}) : text;

    return data;
  } catch (e) {
    toast.error((e as Error)?.message || 'Network error');
    return handleError(e);
  }
}

const del = (p: string, body?: unknown) =>
  request(p, {
    method: 'DELETE',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

export const API = {
  get: (p: string) => request(p),
  post: (p: string, body?: unknown) =>
    request(p, { method: 'POST', body: JSON.stringify(body || {}) }),
  patch: (p: string, body?: unknown) =>
    request(p, { method: 'PATCH', body: JSON.stringify(body || {}) }),
  delete: del,
};

export const Auth = {
  async login(email: string, password: string) {
    const data = await API.post('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('me', JSON.stringify(data.user));
    toast.success('Logged in');
    return data;
  },
  async register(name: string, email: string, password: string) {
    const data = await API.post('/api/auth/register', {
      name,
      email,
      password,
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('me', JSON.stringify(data.user));
    toast.success('Account created');
    return data;
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('me');
    toast.info('Logged out');
  },
  me(): { id: string; name: string; email: string } | null {
    try {
      return JSON.parse(localStorage.getItem('me') || 'null');
    } catch {
      return null;
    }
  },
};

export const Teams = {
  create(name: string) {
    return API.post('/api/teams', { name });
  },
  join(code: string) {
    return API.post('/api/teams/join', { code });
  },
  listMine() {
    return API.get('/api/teams');
  },
  listOwned() {
    return API.get('/api/teams/owned');
  },
  get(id: string) {
    return API.get(`/api/teams/${id}`);
  },
  update(id: string, name: string) {
    return API.patch(`/api/teams/${id}`, { name });
  },
  rotateCode(id: string) {
    return API.post(`/api/teams/${id}/rotate-code`);
  },
  leave(id: string) {
    return API.post(`/api/teams/${id}/leave`);
  },
  // Soft delete team
  remove(id: string) {
    return API.delete(`/api/teams/${id}`);
  },
  // Hard delete team
  removeHard(id: string) {
    return API.delete(`/api/teams/${id}/hard`);
  },
  members(id: string) {
    return API.get(`/api/teams/${id}/members`);
  },
};

/* ----- Standups (team, my) ----- */
export const Standups = {
  // Team list — admins can pass includeDeleted=true to see soft-deleted rows
  team(teamId: string, date?: string, includeDeleted?: boolean) {
    const s = new URLSearchParams();
    if (date) s.set('date', date);
    if (includeDeleted) s.set('includeDeleted', 'true');
    const qs = s.toString() ? `?${s.toString()}` : '';
    return API.get(`/api/standups/team/${teamId}${qs}`);
  },

  // My standups — can includeDeleted=true if user wants to see their deleted ones
  mine(params: {
    from?: string;
    to?: string;
    teamId?: string;
    page?: number | string;
    limit?: number | string;
    includeDeleted?: boolean;
  }) {
    const s = new URLSearchParams();
    if (params.from) s.set('from', params.from);
    if (params.to) s.set('to', params.to);
    if (params.teamId) s.set('teamId', params.teamId);
    if (params.page) s.set('page', String(params.page));
    if (params.limit) s.set('limit', String(params.limit));
    if (params.includeDeleted) s.set('includeDeleted', 'true');
    const qs = s.toString() ? `?${s.toString()}` : '';
    return API.get(`/api/standups/me${qs}`);
  },

  create(body: {
    teamId: string;
    yesterday: string;
    today: string;
    blockers?: string;
  }) {
    return API.post('/api/standups', body);
  },

  update(
    id: string,
    body: Partial<{ yesterday: string; today: string; blockers: string }>
  ) {
    return API.patch(`/api/standups/${id}`, body);
  },

  // Soft delete (author or admin; today only)
  delete(id: string) {
    return API.delete(`/api/standups/${id}`);
  },

  // Restore a soft-deleted standup (author or admin; today only)
  restore(id: string) {
    return API.post(`/api/standups/${id}/restore`);
  },

  // Hard delete (admin only; today only)
  deleteHard(id: string) {
    return API.delete(`/api/standups/${id}/hard`);
  },
};

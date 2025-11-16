export function isAuthed() { return !!localStorage.getItem('token') }
export function userName() { try { return JSON.parse(localStorage.getItem('me')||'{}').name || '' } catch { return '' } }

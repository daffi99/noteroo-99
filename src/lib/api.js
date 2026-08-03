const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api')

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const rawToken = localStorage.getItem('token')
    if (rawToken && typeof rawToken === 'string') {
      const cleanToken = rawToken.trim().replace(/[\r\n]/g, '')
      if (cleanToken && cleanToken !== 'null' && cleanToken !== 'undefined') {
        headers['Authorization'] = `Bearer ${cleanToken}`
      }
    }
  } catch {
    // Ignore storage errors
  }
  return headers
}

async function safeFetchJson(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    if (!res.ok) {
      throw new Error(`Server error (${res.status})`)
    }
    throw new Error('Invalid server response format')
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`)
  }
  return data
}

export const api = {
  // Auth
  async register({ email, password, name }) {
    const data = await safeFetchJson(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    })
    if (data.token && typeof data.token === 'string') {
      localStorage.setItem('token', data.token.trim())
    }
    return data
  },

  async login({ email, password }) {
    const data = await safeFetchJson(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    if (data.token && typeof data.token === 'string') {
      localStorage.setItem('token', data.token.trim())
    }
    return data
  },

  async logout() {
    localStorage.removeItem('token')
    return safeFetchJson(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  },

  async getMe() {
    return safeFetchJson(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
  },

  async updateProfile({ name, avatar_url }) {
    return safeFetchJson(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ name, avatar_url }),
    })
  },

  // Notes
  async getNotes() {
    return safeFetchJson(`${API_URL}/notes`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
  },

  async getTrashNotes() {
    return safeFetchJson(`${API_URL}/notes/trash`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
  },

  async createNote(note) {
    return safeFetchJson(`${API_URL}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(note),
    })
  },

  async updateNote(id, noteData) {
    return safeFetchJson(`${API_URL}/notes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(noteData),
    })
  },

  async deleteNote(id) {
    return safeFetchJson(`${API_URL}/notes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
  },

  async restoreNote(id) {
    return safeFetchJson(`${API_URL}/notes/${id}/restore`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
  },

  async permanentDeleteNote(id) {
    return safeFetchJson(`${API_URL}/notes/${id}/permanent`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
  },

  async emptyTrash() {
    return safeFetchJson(`${API_URL}/notes/trash/empty`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
  },

  // Categories
  async getCategories() {
    return safeFetchJson(`${API_URL}/categories`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
  },

  async createCategory(category) {
    return safeFetchJson(`${API_URL}/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(category),
    })
  },

  async updateCategory(id, data) {
    return safeFetchJson(`${API_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    })
  },

  async deleteCategory(id) {
    return safeFetchJson(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
  },
}

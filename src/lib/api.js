const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api')

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const api = {
  // Auth
  async register({ email, password, name }) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to register account')
    if (data.token) {
      localStorage.setItem('token', data.token)
    }
    return data
  },

  async login({ email, password }) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to log in')
    if (data.token) {
      localStorage.setItem('token', data.token)
    }
    return data
  },

  async logout() {
    localStorage.removeItem('token')
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to log out')
    return res.json()
  },

  async getMe() {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Not authenticated')
    return res.json()
  },

  async updateProfile({ name, avatar_url }) {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ name, avatar_url }),
    })
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Server error (${res.status}): ${text.substring(0, 100)}`)
    }
    if (!res.ok) throw new Error(data.error || 'Failed to update profile')
    return data
  },

  // Notes
  async getNotes() {
    const res = await fetch(`${API_URL}/notes`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch notes')
    return res.json()
  },

  async getTrashNotes() {
    const res = await fetch(`${API_URL}/notes/trash`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch trashed notes')
    return res.json()
  },

  async createNote(note) {
    const res = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(note),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create note')
    return data
  },

  async updateNote(id, noteData) {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(noteData),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update note')
    return data
  },

  async deleteNote(id) {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to move note to trash')
    return res.json()
  },

  async restoreNote(id) {
    const res = await fetch(`${API_URL}/notes/${id}/restore`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to restore note')
    return res.json()
  },

  async permanentDeleteNote(id) {
    const res = await fetch(`${API_URL}/notes/${id}/permanent`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to delete note permanently')
    return res.json()
  },

  async emptyTrash() {
    const res = await fetch(`${API_URL}/notes/trash/empty`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to empty trash')
    return res.json()
  },

  // Categories
  async getCategories() {
    const res = await fetch(`${API_URL}/categories`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch categories')
    return res.json()
  },

  async createCategory(category) {
    const res = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(category),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create category')
    return data
  },

  async updateCategory(id, data) {
    const res = await fetch(`${API_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    })
    const responseData = await res.json()
    if (!res.ok) throw new Error(responseData.error || 'Failed to update category')
    return responseData
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to delete category')
    return res.json()
  },
}

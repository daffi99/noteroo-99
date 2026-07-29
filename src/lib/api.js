const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api')

export const api = {
  // Notes
  async getNotes() {
    const res = await fetch(`${API_URL}/notes`)
    if (!res.ok) throw new Error('Failed to fetch notes')
    return res.json()
  },

  async createNote(note) {
    const res = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    })
    if (!res.ok) throw new Error('Failed to create note')
    return res.json()
  },

  async updateNote(id, data) {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update note')
    return res.json()
  },

  async deleteNote(id) {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete note')
    return res.json()
  },

  // Categories
  async getCategories() {
    const res = await fetch(`${API_URL}/categories`)
    if (!res.ok) throw new Error('Failed to fetch categories')
    return res.json()
  },

  async createCategory(category) {
    const res = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create category')
    return data
  },

  async updateCategory(id, data) {
    const res = await fetch(`${API_URL}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const responseData = await res.json()
    if (!res.ok) throw new Error(responseData.error || 'Failed to update category')
    return responseData
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete category')
    return res.json()
  },
}

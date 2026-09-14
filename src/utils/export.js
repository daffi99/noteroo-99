export function parseTipTapContent(jsonNode) {
  if (!jsonNode) return ''

  if (jsonNode.type === 'text') {
    return jsonNode.text || ''
  }

  if (jsonNode.content && Array.isArray(jsonNode.content)) {
    const childrenText = jsonNode.content.map(parseTipTapContent)

    switch (jsonNode.type) {
      case 'paragraph':
        return childrenText.join('') + '\n\n'

      case 'heading': {
        const level = jsonNode.attrs?.level || 1
        const prefix = '#'.repeat(level) + ' '
        return prefix + childrenText.join('') + '\n\n'
      }

      case 'bulletList':
      case 'orderedList':
        return childrenText.join('') + '\n'

      case 'listItem':
        return '• ' + childrenText.join('').trim() + '\n'

      case 'taskList':
        return childrenText.join('') + '\n'

      case 'taskItem': {
        const checked = jsonNode.attrs?.checked ? '[x]' : '[ ]'
        return `- ${checked} ` + childrenText.join('').trim() + '\n'
      }

      case 'blockquote':
        return '> ' + childrenText.join('').trim() + '\n\n'

      case 'codeBlock':
        return '```\n' + childrenText.join('') + '\n```\n\n'

      case 'horizontalRule':
        return '---\n\n'

      default:
        return childrenText.join('')
    }
  }

  return ''
}

export function formatNoteAsFullText(note) {
  if (!note) return ''

  const title = note.title || 'Untitled Note'
  const dateStr = note.created_at
    ? new Date(note.created_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })

  let bodyText = ''
  if (note.content) {
    if (typeof note.content === 'string') {
      bodyText = note.content
    } else if (note.content.content) {
      bodyText = parseTipTapContent(note.content)
    }
  }

  let fullText = `${title.toUpperCase()}\n`
  fullText += `========================================\n`
  if (note.category_name) {
    fullText += `Category: ${note.category_name}\n`
  }
  fullText += `Date: ${dateStr}\n`
  fullText += `========================================\n\n`
  fullText += bodyText ? bodyText.trim() : '(No content)'

  return fullText
}

export function formatNoteAsJson(note) {
  if (!note) return '{}'

  const title = note.title || 'Untitled Note'
  const dateStr = note.created_at
    ? new Date(note.created_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })

  const fullText = formatNoteAsFullText(note)

  let bodyMarkdown = ''
  if (note.content) {
    if (typeof note.content === 'string') {
      bodyMarkdown = note.content
    } else if (note.content.content) {
      bodyMarkdown = parseTipTapContent(note.content).trim()
    }
  }

  const jsonPayload = {
    title,
    category: note.category_name || null,
    date: dateStr,
    full_text: fullText,
    content: bodyMarkdown,
  }

  return JSON.stringify(jsonPayload, null, 2)
}

export function exportNoteToTxt(note) {
  if (!note) return

  const title = note.title || 'Untitled Note'
  const fileContent = formatNoteAsFullText(note)

  // Create Blob and download
  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  // Safe filename
  const safeFilename = title.replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_') || 'note'
  link.href = url
  link.download = `${safeFilename}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportNoteToTxt(note) {
  if (!note) return

  const title = note.title || 'Untitled Note'
  const dateStr = note.created_at
    ? new Date(note.created_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString()
  
  let bodyText = ''

  if (note.content) {
    if (typeof note.content === 'string') {
      bodyText = note.content
    } else if (note.content.content) {
      bodyText = parseTipTapContent(note.content)
    }
  }

  let fileContent = `${title.toUpperCase()}\n`
  fileContent += `========================================\n`
  if (note.category_name) {
    fileContent += `Category: ${note.category_name}\n`
  }
  fileContent += `Date: ${dateStr}\n`
  fileContent += `========================================\n\n`
  fileContent += bodyText ? bodyText.trim() : '(No content)'

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

function parseTipTapContent(jsonNode) {
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

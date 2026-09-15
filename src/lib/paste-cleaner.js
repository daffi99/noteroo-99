/**
 * Utilities to clean and normalize pasted content in TipTap editor,
 * specifically handling Google Docs clipboard HTML.
 */

export function cleanPastedHtml(html) {
  if (!html || typeof html !== 'string') return html

  // Detect Google Docs clipboard markup
  const isGoogleDocs =
    html.includes('docs-internal-guid') ||
    (html.includes('margin-top:0pt') && html.includes('margin-bottom:0pt'))

  if (!isGoogleDocs) return html

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // 1. Unwrap Google Docs wrapper <b id="docs-internal-guid-..." style="font-weight:normal;">
    // or <span id="docs-internal-guid-..."> so the bold tag does not bold everything
    const docGuidWrappers = doc.querySelectorAll('[id^="docs-internal-guid"]')
    docGuidWrappers.forEach((wrapper) => {
      const parent = wrapper.parentNode
      if (parent) {
        while (wrapper.firstChild) {
          parent.insertBefore(wrapper.firstChild, wrapper)
        }
        parent.removeChild(wrapper)
      }
    })

    // Helper: check if a paragraph has zero margin (Google Docs uses margin-top:0pt;margin-bottom:0pt)
    const isZeroMargin = (p) => {
      const style = p.getAttribute('style') || ''
      const mbMatch = style.match(/margin-bottom:\s*([0-9.]+)(pt|px|em|rem)?/i)
      const mtMatch = style.match(/margin-top:\s*([0-9.]+)(pt|px|em|rem)?/i)
      const mb = mbMatch ? parseFloat(mbMatch[1]) : 0
      const mt = mtMatch ? parseFloat(mtMatch[1]) : 0
      return mb === 0 && mt === 0
    }

    // Helper: check if a paragraph is empty (only whitespace/nbsp/empty br)
    const isEmptyPara = (p) => {
      const text = (p.textContent || '').replace(/[\s\u00a0\u200b\r\n]/g, '')
      if (text.length > 0) return false
      return !p.querySelector('img, svg, canvas, video, audio, iframe')
    }

    // 2. Merge consecutive sibling zero-margin paragraphs into single paragraphs with <br>
    const paragraphs = Array.from(doc.querySelectorAll('p'))
    let currentLeader = null

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i]
      const empty = isEmptyPara(p)
      const zeroMargin = isZeroMargin(p)

      // Do not merge paragraphs inside lists or tables
      const parentTag = p.parentElement?.tagName?.toUpperCase()
      if (parentTag === 'LI' || parentTag === 'TD' || parentTag === 'TH') {
        currentLeader = null
        continue
      }

      if (empty) {
        // An empty paragraph represents an intentional paragraph break
        currentLeader = null
        continue
      }

      if (!zeroMargin) {
        // Non-zero margin paragraph: keep as separate block
        currentLeader = null
        continue
      }

      // Check if p is an immediate next element sibling of currentLeader within the same parent
      if (
        currentLeader &&
        p.parentElement === currentLeader.parentElement &&
        p.previousElementSibling === currentLeader
      ) {
        // Append <br> line break
        currentLeader.appendChild(doc.createElement('br'))
        // Move all children of p into currentLeader
        while (p.firstChild) {
          currentLeader.appendChild(p.firstChild)
        }
        // Remove p from DOM
        p.remove()
      } else {
        currentLeader = p
      }
    }

    return doc.body.innerHTML
  } catch (err) {
    console.error('Failed to clean Google Docs pasted HTML:', err)
    return html
  }
}

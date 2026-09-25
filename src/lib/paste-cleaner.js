/**
 * Utilities to clean and normalize pasted content in TipTap editor,
 * specifically handling Google Docs clipboard HTML and line breaks.
 */

/**
 * Checks if HTML originated from Google Docs clipboard.
 */
export function isGoogleDocsHtml(html) {
  if (!html || typeof html !== 'string') return false
  return (
    html.includes('docs-internal-guid') ||
    /id=['"]?docs-internal-guid/i.test(html) ||
    (/margin-top:\s*0(?:pt|px)?/i.test(html) && /margin-bottom:\s*0(?:pt|px)?/i.test(html)) ||
    (/dir=['"]ltr['"]/i.test(html) && /line-height:\s*1\.[0-9]+/i.test(html))
  )
}

/**
 * Checks if a paragraph element has explicit zero vertical margin.
 */
function isExplicitZeroMargin(p) {
  const style = p.getAttribute('style') || ''
  if (!/margin/i.test(style)) return false
  const mbMatch = style.match(/margin-bottom:\s*([0-9.]+)(pt|px|em|rem)?/i)
  const mtMatch = style.match(/margin-top:\s*([0-9.]+)(pt|px|em|rem)?/i)
  const marginMatch = style.match(/(?:^|;)\s*margin:\s*0(?:pt|px)?(?:\s+0(?:pt|px)?)*\s*(?:;|$)/i)
  if (marginMatch) return true
  if (mbMatch && mtMatch) {
    return parseFloat(mbMatch[1]) === 0 && parseFloat(mtMatch[1]) === 0
  }
  return false
}

/**
 * Checks if a paragraph element is empty (only whitespace, &nbsp;, empty spans, or <br>).
 */
function isEmptyPara(p) {
  // If it has media, embeds, horizontal rules, or tables, it's not empty
  if (p.querySelector('img, svg, canvas, video, audio, iframe, hr, table, input')) {
    return false
  }
  // Check text content ignoring all whitespace, non-breaking spaces, zero-width spaces
  const text = (p.textContent || '').replace(/[\s\u00a0\u200b\r\n\t]/g, '')
  return text.length === 0
}

/**
 * Cleans pasted HTML:
 * 1. Unwraps Google Docs wrapper <b>/<span id="docs-internal-guid-...">
 * 2. Unwraps <b>/<strong> with font-weight: normal (Google Docs pseudo-wrapper)
 * 3. Preserves intentional blank lines (collapsing multiple consecutive empty paragraphs to at most 1)
 * 4. Merges consecutive sibling zero-margin paragraphs (Google Docs tight lines) with <br>
 * 5. Cleans up leading/trailing <br> inside paragraphs and collapses multiple consecutive <br>
 * 6. Strips white-space: pre / pre-wrap inline styles from spans to prevent stray line breaks
 */
export function cleanPastedHtml(html) {
  if (!html || typeof html !== 'string') return html

  // Check if we should process this HTML (Google Docs or contains empty paragraphs / excessive breaks)
  const isGDocs = isGoogleDocsHtml(html)
  const hasParagraphs = /<p[\s>]/i.test(html)
  const hasBreaks = /<br[\s>/]/i.test(html)

  if (!isGDocs && !hasParagraphs && !hasBreaks) {
    return html
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // 1. Unwrap Google Docs wrapper <b id="docs-internal-guid-..." style="font-weight:normal;">
    // or <span id="docs-internal-guid-..."> so bold tag does not bold everything
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

    // Unwrap <b> or <strong> that has font-weight: normal / 400 (Google Docs wrapper)
    const normalBolds = doc.querySelectorAll('b, strong')
    normalBolds.forEach((el) => {
      const style = el.getAttribute('style') || ''
      if (/font-weight:\s*(normal|400)/i.test(style)) {
        const parent = el.parentNode
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el)
          }
          parent.removeChild(el)
        }
      }
    })

    // 2. Strip white-space: pre-wrap and white-space: pre from spans to prevent HTML newlines turning into line breaks
    if (isGDocs) {
      const styledElements = doc.querySelectorAll('[style*="white-space"]')
      styledElements.forEach((el) => {
        el.style.whiteSpace = ''
        if (!el.getAttribute('style')) {
          el.removeAttribute('style')
        }
      })
    }

    // 3. Remove standalone <br> directly between block elements (e.g. <p>...</p><br><p>...</p>)
    const allBrs = Array.from(doc.querySelectorAll('br'))
    allBrs.forEach((br) => {
      const parent = br.parentElement
      if (!parent) return
      const parentTag = parent.tagName.toUpperCase()
      if (parentTag === 'BODY') {
        br.remove()
      } else if (
        parentTag === 'DIV' &&
        (br.previousElementSibling?.tagName === 'P' || br.nextElementSibling?.tagName === 'P')
      ) {
        br.remove()
      }
    })

    // 4. Process paragraphs:
    // - Merge consecutive sibling zero-margin paragraphs with <br> (Google Docs tight lines)
    // - Collapse multiple consecutive empty paragraphs into at most 1 intentional blank line
    // - Remove leading empty paragraphs at document start
    const paragraphs = Array.from(doc.querySelectorAll('p'))
    let currentLeader = null
    let hasSeenContent = false
    let hasPrecedingEmpty = false

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i]

      // Skip elements inside <pre>
      if (p.closest('pre')) {
        currentLeader = null
        hasSeenContent = true
        hasPrecedingEmpty = false
        continue
      }

      // Do not remove or merge paragraphs inside table cells or list items
      const parentTag = p.parentElement?.tagName?.toUpperCase()
      const isListOrTable = parentTag === 'LI' || parentTag === 'TD' || parentTag === 'TH'

      const empty = isEmptyPara(p)

      if (empty) {
        if (isListOrTable) {
          currentLeader = null
          continue
        }

        // If at the very start before any content, or if we already have an empty paragraph,
        // remove the extra empty paragraph
        if (!hasSeenContent || hasPrecedingEmpty) {
          p.remove()
        } else {
          // Keep this single empty paragraph as an intentional blank line
          p.removeAttribute('style')
          p.removeAttribute('dir')
          p.innerHTML = '<br>'
          hasPrecedingEmpty = true
        }

        currentLeader = null
        continue
      }

      // Non-empty paragraph
      hasSeenContent = true
      hasPrecedingEmpty = false

      if (isListOrTable) {
        currentLeader = null
        continue
      }

      // For Google Docs: merge consecutive sibling zero-margin paragraphs with <br>
      if (isGDocs) {
        const zeroMargin = isExplicitZeroMargin(p)

        if (!zeroMargin) {
          currentLeader = null
          continue
        }

        // Check if p is an immediate next element sibling of currentLeader within the same parent
        // (meaning there was NO empty paragraph between them!)
        if (
          currentLeader &&
          p.parentElement === currentLeader.parentElement &&
          p.previousElementSibling === currentLeader
        ) {
          currentLeader.appendChild(doc.createElement('br'))
          while (p.firstChild) {
            currentLeader.appendChild(p.firstChild)
          }
          p.remove()
          continue
        } else {
          currentLeader = p
          continue
        }
      } else {
        currentLeader = p
      }
    }

    // Remove any trailing empty paragraphs at the end of the document
    const remainingParas = Array.from(doc.querySelectorAll('p'))
    for (let i = remainingParas.length - 1; i >= 0; i--) {
      const p = remainingParas[i]
      if (isEmptyPara(p)) {
        p.remove()
      } else {
        break
      }
    }

    // 5. Clean up leading/trailing <br> inside non-empty paragraphs and collapse consecutive <br>
    const parasToClean = doc.querySelectorAll('p, li, blockquote')
    parasToClean.forEach((container) => {
      // Don't strip <br> from our intentionally kept blank line (<p><br></p>)
      if (isEmptyPara(container)) {
        return
      }

      // Remove leading <br>
      while (container.firstChild && container.firstChild.nodeName === 'BR') {
        container.removeChild(container.firstChild)
      }
      // Remove trailing <br>
      while (container.lastChild && container.lastChild.nodeName === 'BR') {
        container.removeChild(container.lastChild)
      }

      // Collapse consecutive <br> tags within the container
      let prevWasBr = false
      const children = Array.from(container.childNodes)
      for (const node of children) {
        if (node.nodeName === 'BR') {
          if (prevWasBr) {
            node.remove()
          } else {
            prevWasBr = true
          }
        } else if (node.nodeType === 3 && node.textContent.trim() === '') {
          // Whitespace between <br> tags: keep traversing
          continue
        } else {
          prevWasBr = false
        }
      }
    })

    return doc.body.innerHTML
  } catch (err) {
    console.error('Failed to clean pasted HTML:', err)
    return html
  }
}

/**
 * Normalizes pasted plain text to eliminate excessive line breaks (3+ newlines -> 2).
 */
export function cleanPastedText(text) {
  if (!text || typeof text !== 'string') return text
  // Normalize CRLF to LF
  let clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Collapse 3 or more consecutive newlines into 2 (standard single blank line paragraph break)
  clean = clean.replace(/\n{3,}/g, '\n\n')
  return clean
}

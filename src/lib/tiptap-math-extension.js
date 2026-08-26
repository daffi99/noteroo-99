import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Parses numbers from text strings (supports 200.000, 65.000+53.000+155.000, Brakiasi (150) + 304.000, SSD + 40.000+75.000 = 115.000)
 */
export function parseNumberFromText(text) {
  if (!text) return null

  // Ignore lines that are already total calculations (e.g. "Total = 500.000")
  if (/total\s*=/i.test(text)) return null

  let cleanedText = text.trim()

  // 1. If line has an evaluated result after "=" (e.g. "SSD + 40.000+75.000 = 115.000")
  const afterEqualMatch = cleanedText.match(/=\s*([\d\.\,\s]+)$/)
  if (afterEqualMatch) {
    const rawValStr = afterEqualMatch[1].trim()
    const usesDots = rawValStr.includes('.')
    const numDigits = rawValStr.replace(/\./g, '').replace(/,/g, '')
    const num = parseFloat(numDigits)
    if (!isNaN(num)) {
      return { value: num, usesDots }
    }
  }

  // Remove content inside parentheses (e.g. "Brakiasi (150) + 304.000" -> "Brakiasi + 304.000")
  // so numbers like (150) don't override the actual price 304.000
  const textWithoutParens = cleanedText.replace(/\([^)]*\)/g, '').trim()

  // 2. Check for inline math addition/subtraction/multiplication (e.g. "65.000+53.000+155.000")
  const inlineMathMatch = textWithoutParens.match(/(?:^|[\/\:\,\s\a-zA-Z\+])\s*([\d\.]+(?:\s*[\+\-\*\/]\s*[\d\.]+)+)/)
  if (inlineMathMatch) {
    const expr = inlineMathMatch[1].trim()
    const evalRes = evaluateMathExpression(expr)
    if (evalRes !== null) {
      return { value: evalRes.value, usesDots: evalRes.usesDots }
    }
  }

  // 3. Extract primary single number from line (e.g. "+ 304.000", "200.000", "Rp 150.000", "25k")
  const match = textWithoutParens.match(/(?:^|\s|-|\+|\:|\/|\$|Rp\.?)\s*([\d\.]+)\s*(k|rb|ribu|m|jt)?(?:\s|$)/i)
  if (!match) return null

  let rawStr = match[1]
  const suffix = (match[2] || '').toLowerCase()
  const usesDots = rawStr.includes('.')

  // Strip dots to parse underlying number value
  let cleanedDigits = rawStr.replace(/\./g, '')
  if (!cleanedDigits || !/^\d+$/.test(cleanedDigits)) return null

  let num = parseFloat(cleanedDigits)
  if (isNaN(num)) return null

  if (suffix === 'k' || suffix === 'rb' || suffix === 'ribu') {
    num *= 1000
  } else if (suffix === 'm' || suffix === 'jt') {
    num *= 1000000
  }

  return { value: num, usesDots }
}

/**
 * Formats a number cleanly with dot or comma thousand separators
 */
export function formatNumber(val, useDots = true) {
  if (typeof val !== 'number' || isNaN(val)) return '0'
  const isInt = Number.isInteger(val)
  const numStr = isInt ? val.toString() : val.toFixed(2)

  if (useDots) {
    const parts = numStr.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return parts.join(',')
  } else {
    return val.toLocaleString()
  }
}

/**
 * Safely evaluates single-line math expressions (supports 65.000+53.000+155.000 = 273.000)
 */
export function evaluateMathExpression(exprStr) {
  if (!exprStr) return null

  let cleaned = exprStr.replace(/^=/, '').trim()
  if (!cleaned) return null

  // Check if expression uses Indonesian dot thousand separators (e.g. 513.000 - 52.000)
  let usesDots = false
  if (/\d{1,3}(?:\.\d{3})+/.test(cleaned)) {
    usesDots = true
    cleaned = cleaned.replace(/(\d{1,3})(?:\.(\d{3}))+/g, (match) => match.replace(/\./g, ''))
  }

  // Handle "X% of Y" -> (X / 100 * Y)
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\%\s*of\s*(\d+(?:\.\d+)?)/gi, '($1 / 100 * $2)')
  // Handle "X%" -> (X / 100)
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\%/g, '($1 / 100)')
  // Handle "^" -> "**"
  cleaned = cleaned.replace(/\^/g, '**')
  // Handle visual math symbols
  cleaned = cleaned.replace(/×/g, '*').replace(/÷/g, '/')
  // Handle "15 x 8" -> "15 * 8"
  cleaned = cleaned.replace(/(\d+)\s*x\s*(\d+)/gi, '$1 * $2')

  if (!/\d/.test(cleaned) || !/^[\d\.\+\-\*\/\%\(\)\s]+$/.test(cleaned)) {
    return null
  }

  try {
    const result = new Function(`"use strict"; return (${cleaned})`)()
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      const val = Number.isInteger(result) ? result : parseFloat(result.toFixed(4))
      return { value: val, usesDots }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Scopes calculation to ONLY the specific checklist/list group near pos
 */
function getScopedListSum(doc, pos) {
  const $pos = doc.resolve(pos)
  const items = []

  // 1. Check if pos is inside a taskList / bulletList / orderedList
  let listNode = null
  for (let depth = $pos.depth; depth > 0; depth--) {
    const parent = $pos.node(depth)
    if (
      parent.type.name === 'taskList' ||
      parent.type.name === 'bulletList' ||
      parent.type.name === 'orderedList'
    ) {
      listNode = parent
      break
    }
  }

  if (listNode) {
    // Collect text only from children of this specific list
    listNode.forEach((child) => {
      if (child.textContent) {
        items.push(child.textContent)
      }
    })
  } else {
    // 2. Check immediately adjacent list node (next or previous sibling)
    let foundAdjacent = false
    const parentDepth = Math.max(1, $pos.depth)
    const blockIndex = $pos.index(parentDepth - 1)
    const parentNode = $pos.node(parentDepth - 1)

    if (parentNode && parentNode.childCount > 0) {
      // Check next sibling list
      if (blockIndex + 1 < parentNode.childCount) {
        const nextSibling = parentNode.child(blockIndex + 1)
        if (
          nextSibling &&
          (nextSibling.type.name === 'taskList' ||
            nextSibling.type.name === 'bulletList' ||
            nextSibling.type.name === 'orderedList')
        ) {
          nextSibling.forEach((child) => {
            if (child.textContent) items.push(child.textContent)
          })
          foundAdjacent = true
        }
      }

      // Check previous sibling list
      if (!foundAdjacent && blockIndex > 0) {
        const prevSibling = parentNode.child(blockIndex - 1)
        if (
          prevSibling &&
          (prevSibling.type.name === 'taskList' ||
            prevSibling.type.name === 'bulletList' ||
            prevSibling.type.name === 'orderedList')
        ) {
          prevSibling.forEach((child) => {
            if (child.textContent) items.push(child.textContent)
          })
          foundAdjacent = true
        }
      }
    }

    // 3. Fallback: contiguous block lines without empty lines in between
    if (!foundAdjacent) {
      const allBlocks = []
      doc.nodesBetween(0, doc.content.size, (node, nodePos) => {
        if (node.isBlock && node.isTextblock) {
          allBlocks.push({ pos: nodePos, text: node.textContent })
        }
      })

      const currIndex = allBlocks.findIndex(
        (b) => b.pos <= pos && pos <= b.pos + b.text.length + 4
      )
      if (currIndex !== -1) {
        // Look backwards until empty line
        for (let i = currIndex - 1; i >= 0; i--) {
          const t = allBlocks[i].text.trim()
          if (!t) break
          items.push(t)
        }
        // Look forwards until empty line
        for (let i = currIndex + 1; i < allBlocks.length; i++) {
          const t = allBlocks[i].text.trim()
          if (!t) break
          items.push(t)
        }
      }
    }
  }

  let total = 0
  let count = 0
  let preferDots = false

  for (const itemText of items) {
    const parsed = parseNumberFromText(itemText)
    if (parsed) {
      total += parsed.value
      count++
      if (parsed.usesDots) preferDots = true
    }
  }

  if (count > 0) {
    return { total, count, preferDots }
  }

  return null
}

export const MathCalculationExtension = Extension.create({
  name: 'mathCalculation',

  addCommands() {
    return {
      evaluateCurrentLine:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state
          const { $from } = selection
          const lineText = $from.parent.textContent

          // 1. Single line math check
          if (lineText) {
            let exprMatch = lineText.match(/(?:^|[\/\:\,\s\a-zA-Z])\s*([\d\.\+\-\*\/\%\(\)\s x×÷]+)$/)
            if (exprMatch) {
              const rawExpr = exprMatch[1]
              const res = evaluateMathExpression(rawExpr)
              if (res !== null && dispatch) {
                const formatted = formatNumber(res.value, res.usesDots)
                const tr = state.tr.insertText(` = ${formatted} `)
                dispatch(tr)
                return true
              }
            }
          }

          // 2. Scoped checklist / adjacent items sum check
          const sumData = getScopedListSum(state.doc, $from.pos)
          if (sumData && dispatch) {
            const formatted = formatNumber(sumData.total, sumData.preferDots)
            const tr = state.tr.insertText(` = ${formatted}`)
            dispatch(tr)
            return true
          }

          return false
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('mathCalculationPlugin'),
        appendTransaction(transactions, oldState, newState) {
          const docChanged = transactions.some((tr) => tr.docChanged)
          if (!docChanged) return null

          const { doc } = newState
          let tr = null

          // Auto-recalculate any "Total = ..." line when list numbers are updated
          doc.descendants((node, pos) => {
            if (node.isText) {
              const text = node.text
              const totalMatch = text.match(/(.*Total\s*=\s*)([\d\.]+)/i)
              if (totalMatch) {
                const prefixWithSpace = totalMatch[1]
                const currentValStr = totalMatch[2]

                const sumData = getScopedListSum(doc, pos)
                if (sumData) {
                  const newFormattedVal = formatNumber(sumData.total, sumData.preferDots)
                  if (currentValStr !== newFormattedVal) {
                    if (!tr) tr = newState.tr
                    const startPos = pos + totalMatch.index + prefixWithSpace.length
                    const endPos = startPos + currentValStr.length
                    tr = tr.replaceWith(
                      startPos,
                      endPos,
                      newState.schema.text(newFormattedVal)
                    )
                  }
                }
              }
            }
          })

          return tr
        },
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view
            const $from = state.doc.resolve(from)
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

            // 1. If user typed '=' -> Evaluate single-line math or scoped list sum
            if (text === '=') {
              // Try single-line math calculation (e.g. "Peralatan mati lampu / 65.000+53.000+155.000")
              const mathMatch = textBefore.match(/(?:^|[\/\:\,\s\a-zA-Z])\s*([\d\.\+\-\*\/\%\(\)\s x×÷]+)$/)
              if (mathMatch) {
                const expr = mathMatch[1].trim()
                const res = evaluateMathExpression(expr)
                if (res !== null) {
                  const formattedResult = formatNumber(res.value, res.usesDots)
                  const tr = state.tr.replaceWith(
                    from,
                    to,
                    state.schema.text(` = ${formattedResult} `)
                  )
                  view.dispatch(tr)
                  return true
                }
              }

              // Scoped calculation from target checklist / list
              const sumData = getScopedListSum(state.doc, from)
              if (sumData) {
                const formattedResult = formatNumber(sumData.total, sumData.preferDots)
                const tr = state.tr.replaceWith(
                  from,
                  to,
                  state.schema.text(` = ${formattedResult} `)
                )
                view.dispatch(tr)
                return true
              }

              return false
            }

            // 2. Auto-format numbers with dots as user types digits (e.g. typing 000 after 200 -> 200.000, 2000000 -> 2.000.000)
            if (/^\d$/.test(text)) {
              const numTokenMatch = textBefore.match(/(?:^|[\s\+\-\:\/\$\(\=\*\;\,]|Rp\.?)([\d\.]+)$/i)
              if (numTokenMatch) {
                const prevToken = numTokenMatch[1]
                const projectedToken = prevToken + text
                const cleanDigits = projectedToken.replace(/\./g, '')

                // Format when we have 4 or more digits
                if (cleanDigits.length >= 4 && /^\d+$/.test(cleanDigits)) {
                  const formatted = cleanDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                  if (formatted !== projectedToken) {
                    const tokenStart = from - prevToken.length
                    const tokenEnd = to
                    const tr = state.tr.replaceWith(
                      tokenStart,
                      tokenEnd,
                      state.schema.text(formatted)
                    )
                    view.dispatch(tr)
                    return true
                  }
                }
              }
            }

            return false
          },
        },
      }),
    ]
  },
})

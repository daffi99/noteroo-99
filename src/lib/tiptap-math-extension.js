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
export function getScopedListSum(doc, pos) {
  const $pos = doc.resolve(pos)
  const items = []

  const isListNodeType = (node) =>
    node &&
    (node.type.name === 'taskList' ||
      node.type.name === 'bulletList' ||
      node.type.name === 'orderedList')

  const isTotalLine = (text) => {
    if (!text) return false
    return /(?:total|jumlah|subtotal|hasil|^[a-zA-Z\s\d]+)\s*=\s*[\d\.\,]+/i.test(text)
  }

  // 1. Check if pos is inside a taskList / bulletList / orderedList
  let listNode = null
  for (let depth = $pos.depth; depth > 0; depth--) {
    const parent = $pos.node(depth)
    if (isListNodeType(parent)) {
      listNode = parent
      break
    }
  }

  if (listNode) {
    // Collect text from this list node
    listNode.forEach((child) => {
      if (child.textContent) {
        items.push(child.textContent)
      }
    })

    // Also check adjacent contiguous sibling lists
    for (let d = $pos.depth; d > 0; d--) {
      if ($pos.node(d) === listNode) {
        const parentOfList = $pos.node(d - 1)
        const indexOfList = $pos.index(d - 1)
        if (parentOfList) {
          for (let i = indexOfList + 1; i < parentOfList.childCount; i++) {
            const sib = parentOfList.child(i)
            if (isListNodeType(sib)) {
              sib.forEach((child) => {
                if (child.textContent) items.push(child.textContent)
              })
            } else {
              break
            }
          }
          for (let i = indexOfList - 1; i >= 0; i--) {
            const sib = parentOfList.child(i)
            if (isListNodeType(sib)) {
              sib.forEach((child) => {
                if (child.textContent) items.push(child.textContent)
              })
            } else {
              break
            }
          }
        }
        break
      }
    }
  } else {
    // 2. pos is outside a list (e.g. in a heading or paragraph like "Shopee Pay later october 25th = ")
    const parentDepth = Math.max(1, $pos.depth)
    const blockIndex = $pos.index(parentDepth - 1)
    const parentNode = $pos.node(parentDepth - 1)
    let foundAdjacent = false

    if (parentNode && parentNode.childCount > 0) {
      // Check all subsequent contiguous lists / items below this block
      for (let i = blockIndex + 1; i < parentNode.childCount; i++) {
        const sibling = parentNode.child(i)
        if (isListNodeType(sibling)) {
          sibling.forEach((child) => {
            if (child.textContent) items.push(child.textContent)
          })
          foundAdjacent = true
        } else if (sibling.isTextblock) {
          const txt = sibling.textContent.trim()
          if (!txt || isTotalLine(txt)) {
            break
          }
          const parsed = parseNumberFromText(txt)
          if (parsed) {
            items.push(txt)
            foundAdjacent = true
          } else {
            break
          }
        } else {
          break
        }
      }

      // Check all preceding contiguous lists / items above this block
      if (!foundAdjacent && blockIndex > 0) {
        for (let i = blockIndex - 1; i >= 0; i--) {
          const sibling = parentNode.child(i)
          if (isListNodeType(sibling)) {
            sibling.forEach((child) => {
              if (child.textContent) items.push(child.textContent)
            })
            foundAdjacent = true
          } else if (sibling.isTextblock) {
            const txt = sibling.textContent.trim()
            if (!txt || isTotalLine(txt)) {
              break
            }
            const parsed = parseNumberFromText(txt)
            if (parsed) {
              items.push(txt)
              foundAdjacent = true
            } else {
              break
            }
          } else {
            break
          }
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
        // Look forwards
        for (let i = currIndex + 1; i < allBlocks.length; i++) {
          const t = allBlocks[i].text.trim()
          if (!t || isTotalLine(t)) break
          items.push(t)
        }
        // Look backwards
        for (let i = currIndex - 1; i >= 0; i--) {
          const t = allBlocks[i].text.trim()
          if (!t || isTotalLine(t)) break
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
          const lineText = $from.parent.textContent.trim()

          // Case A: Line already contains "= <number>" e.g. "Shopee Pay later october 25th = 409.000" or "40.000+75.000 = 115.000"
          const existingEqMatch = lineText.match(/^(.*?)=\s*([\d\.\,]+)\s*$/)
          if (existingEqMatch) {
            const prefix = existingEqMatch[1].trim()
            // Check if prefix has inline math (e.g. "40.000+75.000")
            const inlineMath = prefix.match(/(?:^|[\/\:\,\s\a-zA-Z])\s*([\d\.]+(?:\s*[\+\-\*\/]\s*[\d\.]+)+)$/)
            if (inlineMath) {
              const res = evaluateMathExpression(inlineMath[1].trim())
              if (res !== null && dispatch) {
                const formatted = formatNumber(res.value, res.usesDots)
                const lineStart = $from.start()
                const lineEnd = $from.end()
                const tr = state.tr.replaceWith(lineStart, lineEnd, state.schema.text(`${prefix} = ${formatted}`))
                dispatch(tr)
                return true
              }
            }

            // Otherwise evaluate as scoped list sum
            const sumData = getScopedListSum(state.doc, $from.pos)
            if (sumData && dispatch) {
              const formatted = formatNumber(sumData.total, sumData.preferDots)
              const lineStart = $from.start()
              const lineEnd = $from.end()
              const tr = state.tr.replaceWith(lineStart, lineEnd, state.schema.text(`${prefix} = ${formatted}`))
              dispatch(tr)
              return true
            }
          }

          // Case B: Single line math without "=" yet (e.g. "40.000+75.000")
          if (lineText) {
            const exprMatch = lineText.match(/(?:^|[\/\:\,\s\a-zA-Z])\s*([\d\.]+(?:\s*[\+\-\*\/]\s*[\d\.]+)+)$/)
            if (exprMatch) {
              const rawExpr = exprMatch[1]
              const res = evaluateMathExpression(rawExpr)
              if (res !== null && dispatch) {
                const formatted = formatNumber(res.value, res.usesDots)
                const tr = state.tr.insertText(` = ${formatted}`)
                dispatch(tr)
                return true
              }
            }
          }

          // Case C: Scoped checklist / adjacent items sum check (e.g. "Shopee Pay later october 25th" or "Total")
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

          // Auto-recalculate any calculation line ("Total = ...", "Shopee Pay later... = ...", or inline math)
          doc.descendants((node, pos) => {
            if (node.isText) {
              const text = node.text
              const totalMatch = text.match(/(.*=\s*)([\d\.]+)/)
              if (totalMatch) {
                const prefixWithEqual = totalMatch[1]
                const currentValStr = totalMatch[2]
                const prefixBeforeEqual = prefixWithEqual.replace(/=\s*$/, '').trim()

                // If prefix has inline math (like "40.000+75.000 = "), evaluate math
                const inlineMath = prefixBeforeEqual.match(/(?:^|[\/\:\,\s\a-zA-Z])\s*([\d\.]+(?:\s*[\+\-\*\/]\s*[\d\.]+)+)$/)
                if (inlineMath) {
                  const res = evaluateMathExpression(inlineMath[1].trim())
                  if (res !== null) {
                    const newFormattedVal = formatNumber(res.value, res.usesDots)
                    if (currentValStr !== newFormattedVal) {
                      if (!tr) tr = newState.tr
                      const startPos = pos + totalMatch.index + prefixWithEqual.length
                      const endPos = startPos + currentValStr.length
                      tr = tr.replaceWith(
                        startPos,
                        endPos,
                        newState.schema.text(newFormattedVal)
                      )
                    }
                  }
                } else {
                  // List total (e.g. "Shopee Pay later october 25th = " or "Total = ")
                  const sumData = getScopedListSum(doc, pos)
                  if (sumData) {
                    const newFormattedVal = formatNumber(sumData.total, sumData.preferDots)
                    if (currentValStr !== newFormattedVal) {
                      if (!tr) tr = newState.tr
                      const startPos = pos + totalMatch.index + prefixWithEqual.length
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
              const mathMatch = textBefore.match(/(?:^|[\/\:\,\s\a-zA-Z])\s*([\d\.]+(?:\s*[\+\-\*\/]\s*[\d\.]+)+)$/)
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

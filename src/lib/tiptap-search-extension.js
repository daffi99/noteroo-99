import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const searchPluginKey = new PluginKey('searchHighlightPlugin')

/**
 * Finds all occurrences of query in a ProseMirror document
 */
export function findMatchesInDoc(doc, query, matchCase = false) {
  if (!query || typeof query !== 'string' || !query.trim()) return []
  const cleanQuery = query.trim()
  const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const flags = matchCase ? 'g' : 'gi'
  const regex = new RegExp(escaped, flags)

  const matches = []
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      let m
      while ((m = regex.exec(node.text)) !== null) {
        matches.push({
          from: pos + m.index,
          to: pos + m.index + m[0].length,
          text: m[0],
        })
      }
    }
  })

  return matches
}

export const SearchHighlightExtension = Extension.create({
  name: 'searchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return { query: '', activeIndex: 0, matches: [], matchCase: false }
          },
          apply(tr, prev) {
            const meta = tr.getMeta(searchPluginKey)
            if (meta !== undefined) {
              return { ...prev, ...meta }
            }
            if (tr.docChanged && prev.query) {
              const matches = findMatchesInDoc(tr.doc, prev.query, prev.matchCase)
              return {
                ...prev,
                matches,
                activeIndex: Math.min(prev.activeIndex, Math.max(0, matches.length - 1)),
              }
            }
            return prev
          },
        },
        props: {
          decorations(state) {
            const pluginState = searchPluginKey.getState(state)
            if (!pluginState || !pluginState.query || !pluginState.matches || pluginState.matches.length === 0) {
              return DecorationSet.empty
            }

            const { activeIndex, matches } = pluginState
            const decos = matches.map((m, idx) => {
              const isActive = idx === activeIndex
              return Decoration.inline(m.from, m.to, {
                class: isActive
                  ? 'search-result-match search-result-match--active'
                  : 'search-result-match',
              })
            })

            return DecorationSet.create(state.doc, decos)
          },
        },
      }),
    ]
  },
})

import React from 'react'
import {
  Calendar,
  Target,
  FileText,
  Lightbulb,
  CheckSquare,
  Briefcase,
  User,
  Bookmark,
  Heart,
  Star,
  Folder,
  Sparkles,
  Code,
  BookOpen,
  DollarSign,
  Clock,
  Zap,
  Smile,
  Compass,
  ShoppingBag,
  Music,
  Camera,
  Layers,
  Tag,
  StickyNote,
} from 'lucide-react'

export const AVAILABLE_ICONS = [
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'target', label: 'Target', icon: Target },
  { id: 'file-text', label: 'Document', icon: FileText },
  { id: 'lightbulb', label: 'Idea', icon: Lightbulb },
  { id: 'check-square', label: 'Tasks', icon: CheckSquare },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { id: 'briefcase', label: 'Work', icon: Briefcase },
  { id: 'user', label: 'Personal', icon: User },
  { id: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { id: 'heart', label: 'Favorite', icon: Heart },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'folder', label: 'Folder', icon: Folder },
  { id: 'book-open', label: 'Reading', icon: BookOpen },
  { id: 'dollar-sign', label: 'Finance', icon: DollarSign },
  { id: 'clock', label: 'Clock', icon: Clock },
  { id: 'zap', label: 'Urgent', icon: Zap },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'smile', label: 'Life', icon: Smile },
  { id: 'compass', label: 'Explore', icon: Compass },
  { id: 'shopping-bag', label: 'Shopping', icon: ShoppingBag },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'camera', label: 'Media', icon: Camera },
  { id: 'layers', label: 'Project', icon: Layers },
  { id: 'tag', label: 'Tag', icon: Tag },
]

const ICON_MAP = {
  calendar: Calendar,
  target: Target,
  'file-text': FileText,
  lightbulb: Lightbulb,
  'check-square': CheckSquare,
  sparkles: Sparkles,
  briefcase: Briefcase,
  user: User,
  bookmark: Bookmark,
  heart: Heart,
  star: Star,
  folder: Folder,
  'book-open': BookOpen,
  'dollar-sign': DollarSign,
  clock: Clock,
  zap: Zap,
  code: Code,
  smile: Smile,
  compass: Compass,
  'shopping-bag': ShoppingBag,
  music: Music,
  camera: Camera,
  layers: Layers,
  tag: Tag,
  'sticky-note': StickyNote,
}

// Fallback resolver by text name if no explicit icon ID is set
export function resolveIconByName(name) {
  if (!name) return 'file-text'
  const lower = name.toLowerCase()

  if (lower.includes('upcom') || lower.includes('event') || lower.includes('sched') || lower.includes('cal')) {
    return 'calendar'
  }
  if (lower.includes('goal') || lower.includes('target') || lower.includes('aim') || lower.includes('obj')) {
    return 'target'
  }
  if (lower.includes('idea') || lower.includes('think') || lower.includes('inspo') || lower.includes('brain')) {
    return 'file-text'
  }
  if (lower.includes('task') || lower.includes('todo') || lower.includes('check') || lower.includes('list')) {
    return 'check-square'
  }
  if (lower.includes('work') || lower.includes('job') || lower.includes('office') || lower.includes('biz')) {
    return 'briefcase'
  }
  if (lower.includes('person') || lower.includes('me') || lower.includes('life') || lower.includes('self')) {
    return 'user'
  }
  if (lower.includes('study') || lower.includes('learn') || lower.includes('book') || lower.includes('read')) {
    return 'book-open'
  }
  if (lower.includes('financ') || lower.includes('money') || lower.includes('budget') || lower.includes('pay')) {
    return 'dollar-sign'
  }
  if (lower.includes('urgent') || lower.includes('prior') || lower.includes('quick') || lower.includes('fast')) {
    return 'zap'
  }
  if (lower.includes('star') || lower.includes('vip') || lower.includes('fav')) {
    return 'star'
  }
  return 'file-text'
}

export default function CategoryIcon({ icon, fallback = '', size = 18, className = '', style = {} }) {
  let resolvedId = icon
  if (!resolvedId || !ICON_MAP[resolvedId]) {
    resolvedId = resolveIconByName(fallback || icon)
  }

  const Component = ICON_MAP[resolvedId] || FileText
  return <Component size={size} className={className} style={style} strokeWidth={2} />
}

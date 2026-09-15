import { ThinkingOrb } from 'thinking-orbs'

export default function ThinkingPill({ text = 'Loading....', size = 28, state = 'searching' }) {
  return (
    <div className="thinking-pill">
      <ThinkingOrb
        state={state}
        size={64}
        style={{ width: size, height: size }}
        theme="light"
      />
      <span className="thinking-pill__text t-shimmer" data-text={text}>
        {text}
      </span>
    </div>
  )
}

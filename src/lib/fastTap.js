let lastGlobalTouchTime = 0;

/**
 * FastTap helper that eliminates the 300ms-500ms touch delay and click cancellation
 * on mobile / iOS Safari / PWA standalone mode.
 * 
 * - Dispatches tap action immediately on touchend (< 450ms, < 12px movement).
 * - Leaves scrolling completely smooth when movement >= 12px.
 * - Suppresses duplicate delayed synthetic mouse clicks on mobile.
 * - Fallbacks seamlessly to standard onClick on desktop mouse.
 */
export function fastTap(callback) {
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let hasMoved = false;

  return {
    onTouchStart: (e) => {
      if (e.touches && e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        hasMoved = false;
      }
    },
    onTouchMove: (e) => {
      if (e.touches && e.touches.length === 1) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 12 || dy > 12) {
          hasMoved = true;
        }
      }
    },
    onTouchEnd: (e) => {
      const duration = Date.now() - startTime;
      if (!hasMoved && duration > 0 && duration < 450) {
        lastGlobalTouchTime = Date.now();
        if (callback) {
          callback(e);
        }
      }
    },
    onClick: (e) => {
      // If a touch tap occurred within the last 600ms, ignore the synthetic mouse click
      if (Date.now() - lastGlobalTouchTime < 600) {
        return;
      }
      if (callback) {
        callback(e);
      }
    }
  };
}

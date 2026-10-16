import { useEffect } from 'react';

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const NATIVE_CONTROL = `${EDITABLE}, button, a, label, summary, audio, video`;

function isFixedActivity(target) {
  // Explicit game surfaces already own their drag gestures, even on long pages.
  for (let element = target; element && element !== document.body; element = element.parentElement) {
    const style = window.getComputedStyle(element);
    if (style.touchAction === 'none') return true;
    if ((/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1)
      || (/(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1)) return false;
  }
  const page = document.scrollingElement;
  return page && page.scrollHeight <= page.clientHeight + 1 && page.scrollWidth <= page.clientWidth + 1;
}

export default function useTouchMagnifierGuard() {
  useEffect(() => {
    // Safari can show its loupe despite user-select:none. Cancel the native
    // touch gesture on fixed artwork; pointer-driven games still receive input.
    const preventMagnifier = (event) => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (!target || event.touches.length !== 1 || target.closest(NATIVE_CONTROL)) return;
      if (event.cancelable && isFixedActivity(target)) event.preventDefault();
    };
    const preventSelection = (event) => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (target && !target.closest(EDITABLE)) event.preventDefault();
    };
    document.addEventListener('touchstart', preventMagnifier, { passive: false });
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('contextmenu', preventSelection);
    return () => {
      document.removeEventListener('touchstart', preventMagnifier);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('contextmenu', preventSelection);
    };
  }, []);
}

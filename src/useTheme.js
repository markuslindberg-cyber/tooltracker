import { useRef, useState, useEffect, useCallback } from 'react';

export const usePullToRefresh = (onRefresh, isDisabled = false) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef(null);
  const PULL_THRESHOLD = 80;

  const stableRefresh = useRef(onRefresh);
  stableRefresh.current = onRefresh;

  useEffect(() => {
    const element = containerRef.current;
    if (!element || isDisabled) return;

    const handleTouchStart = (e) => {
      // Use window scroll position since page scrolls via window
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
        pulling.current = false;
      } else {
        touchStartY.current = 0;
      }
    };

    const handleTouchMove = (e) => {
      if (touchStartY.current === 0 || isDisabled) return;
      // If user has scrolled down since touchstart, cancel pull
      if (window.scrollY > 0) {
        touchStartY.current = 0;
        setPullDistance(0);
        pulling.current = false;
        return;
      }
      const touchY = e.touches[0].clientY;
      const distance = Math.max(0, touchY - touchStartY.current);
      if (distance > 10) {
        pulling.current = true;
        setPullDistance(Math.min(distance, PULL_THRESHOLD + 40));
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      const dist = pulling.current ? pullDistance : 0;
      if (dist >= PULL_THRESHOLD && !isDisabled) {
        setIsPulling(true);
        try {
          await stableRefresh.current();
        } finally {
          setIsPulling(false);
        }
      }
      setPullDistance(0);
      touchStartY.current = 0;
      pulling.current = false;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDisabled, pullDistance]);

  return { containerRef, isPulling, pullDistance, PULL_THRESHOLD };
};
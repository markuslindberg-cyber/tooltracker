import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Sparar och återställer scrollposition per sida med sessionStorage.
 * Använd denna hook i listasidor (t.ex. Uttag, Lager, Inventory).
 */
export function useScrollRestore() {
  const location = useLocation();
  const key = `scroll_${location.pathname}`;
  const isRestored = useRef(false);

  // Återställ scroll när sidan laddas
  useEffect(() => {
    if (isRestored.current) return;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const y = parseInt(saved, 10);
      // Kort fördröjning för att data ska ha renderat
      setTimeout(() => {
        window.scrollTo({ top: y, behavior: 'instant' });
      }, 100);
    }
    isRestored.current = true;

    // Spara scroll när man lämnar sidan
    return () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };
  }, [key]);
}
import { useEffect } from 'react';
import { useGlobalConfig } from './useGlobalConfig';

/**
 * Reads the global theme config and applies the `dark` class to <html>.
 * Supported values: 'light' | 'dark' | 'system' (default).
 */
export function useTheme() {
  const { data: themeConfig } = useGlobalConfig('theme');
  const preference = themeConfig?.config_value?.mode || 'system';

  useEffect(() => {
    const html = document.documentElement;

    if (preference === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else if (preference === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.remove('light');
      // system — follow OS preference
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = (e) => {
        if (e.matches) html.classList.add('dark');
        else html.classList.remove('dark');
      };
      apply(mq);
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [preference]);

  return preference;
}
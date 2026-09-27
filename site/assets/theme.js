/**
 * EnglishPhonetics — Theme Manager (VitePress/Vue.js style minimalist toggle)
 * Supports: system (default), light, dark
 * Persisted in localStorage.
 * No emojis, pure SVG icons with smooth pill switch.
 */
(function() {
  const THEME_KEY = 'ep_theme_preference'; // 'auto' | 'light' | 'dark'

  function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || 'auto';
  }

  function getEffectiveTheme(preference) {
    if (preference === 'dark' || preference === 'light') {
      return preference;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(preference) {
    const root = document.documentElement;
    if (preference === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
    updateSwitcherUI(preference);
  }

  // Apply immediately in head to avoid flash of wrong theme
  const initialPref = getSavedTheme();
  if (initialPref !== 'auto') {
    document.documentElement.setAttribute('data-theme', initialPref);
  }

  // SVG Icons (VitePress / Vue.js style)
  const sunIcon = `<svg class="v-icon v-sun" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  const moonIcon = `<svg class="v-icon v-moon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

  function updateSwitcherUI(pref) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;

    const effective = getEffectiveTheme(pref);
    btn.setAttribute('data-state', effective);
    btn.setAttribute('data-pref', pref);

    let desc = 'Тема: ' + (pref === 'auto' ? `Системная (${effective === 'dark' ? 'тёмная' : 'светлая'})` : (pref === 'dark' ? 'Тёмная' : 'Светлая'));
    btn.setAttribute('aria-label', `${desc}. Нажмите для переключения`);
    btn.setAttribute('title', `${desc} (нажмите, чтобы изменить)`);
  }

  function cycleTheme() {
    const current = getSavedTheme();
    let next = 'auto';
    if (current === 'auto') {
      next = 'light';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      next = 'auto';
    }
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  // System preference change listener
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getSavedTheme() === 'auto') {
        applyTheme('auto');
      }
    });
  }

  // Mount UI when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    let btn = document.getElementById('theme-toggle-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'theme-toggle-btn';
      btn.type = 'button';
      btn.className = 'v-switch';
      btn.innerHTML = `<span class="v-switch-check"><span class="v-switch-icon">${sunIcon}${moonIcon}</span></span>`;
      btn.addEventListener('click', cycleTheme);

      const navLinks = document.querySelector('.site-nav .nav-links');
      if (navLinks) {
        navLinks.appendChild(btn);
      } else {
        const floating = document.createElement('div');
        floating.className = 'theme-floating-container';
        floating.appendChild(btn);
        document.body.appendChild(floating);
      }
    }
    updateSwitcherUI(getSavedTheme());
  });
})();

const THEME_STORAGE_KEY = 'sgsitsColorTheme';
const themeButton = document.createElement('button');

themeButton.className = 'theme-switch';
themeButton.type = 'button';
document.body.append(themeButton);

function updateThemeButton(theme) {
  const dark = theme === 'dark';
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.title = `Switch to ${dark ? 'light' : 'dark'} mode`;
  themeButton.innerHTML = `<span aria-hidden="true">${dark ? '☀' : '☾'}</span><b>${dark ? 'Light' : 'Dark'}</b>`;
}

function applyTheme(theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#03101f' : '#071b34');
  updateThemeButton(theme);

  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still works for this page when storage is unavailable.
    }
  }
}

applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

themeButton.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true);
});

const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)');
systemTheme?.addEventListener?.('change', (event) => {
  let hasSavedPreference = false;
  try {
    hasSavedPreference = Boolean(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Follow the operating-system preference when storage is unavailable.
  }
  if (!hasSavedPreference) applyTheme(event.matches ? 'dark' : 'light');
});

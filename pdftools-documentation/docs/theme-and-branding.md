# Theme and Branding

## Purpose

Document branding assets, naming, and theme implementation.

## Audience

- Frontend developers
- Designers
- Maintainers

## Brand Facts

- Product name: `PDFTools`
- Parent brand: `WellFriend`
- Logo text: `PDFTools by WellFriend`

## Theme System

- provider: `frontend/components/theme/ThemeProvider.tsx`
- toggle: `frontend/components/theme/ThemeToggle.tsx`
- localStorage key: `pdftools-theme`
- modes: `light`, `dark`, `system`
- new visitors default to `system`
- invalid stored theme values are reset to `system`

## Logo and Icon Assets

- `frontend/components/ui/Logo.tsx`
- `frontend/public/logo.svg`
- `frontend/public/logo.png`
- `frontend/public/logo-mark.svg`
- `frontend/public/logo-mark.png`
- `frontend/public/favicon-16x16.png`
- `frontend/public/favicon-32x32.png`
- `frontend/public/apple-touch-icon.png`
- `frontend/app/icon.png`

## Visual Direction

- emerald accent on light mode
- neutral zinc/black dark mode
- no blue-branded dark theme in current implementation
- light mode uses softer off-white and zinc surfaces instead of flat pure white
- dark mode uses layered zinc/neutral gradients instead of flat pitch black
- primary action buttons remain emerald across both themes

## Related Documents

- [frontend-components.md](./frontend-components.md)
- [frontend-routes.md](./frontend-routes.md)

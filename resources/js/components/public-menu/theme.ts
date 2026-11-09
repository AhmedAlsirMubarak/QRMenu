import type { CSSProperties } from 'react';

/** Guest menu themes as CSS variables — restaurants pick one in the menu settings. */
export const THEMES: Record<string, Record<string, string>> = {
    saffron: { '--bg': '#FAFAF8', '--surface': '#FFFFFF', '--ink': '#14110F', '--muted': '#5F5B55', '--line': '#E7E5E0', '--chip': '#F1F0EC', '--accent': '#F2B33D', '--accent-ink': '#14110F', '--active': '#14110F', '--active-ink': '#FFFFFF', '--hero': '#2E2A26', '--good': '#0E4D3F', '--good-bg': '#E8F1EE', '--bad': '#9A3412' },
    noir: { '--bg': '#14110F', '--surface': '#1F1B18', '--ink': '#F5F2EC', '--muted': '#B5B0A8', '--line': '#2E2A26', '--chip': '#2E2A26', '--accent': '#F2B33D', '--accent-ink': '#14110F', '--active': '#F2B33D', '--active-ink': '#14110F', '--hero': '#000000', '--good': '#9ED8C5', '--good-bg': '#1D332C', '--bad': '#F4A47E' },
    garden: { '--bg': '#F5F8F0', '--surface': '#FFFFFF', '--ink': '#10251C', '--muted': '#4D5E55', '--line': '#DCE5D6', '--chip': '#E3ECDD', '--accent': '#0E4D3F', '--accent-ink': '#FFFFFF', '--active': '#0E4D3F', '--active-ink': '#FFFFFF', '--hero': '#1F3B30', '--good': '#0E4D3F', '--good-bg': '#E3ECDD', '--bad': '#9A3412' },
};

export const themeStyle = (theme: string): CSSProperties => (THEMES[theme] ?? THEMES.saffron) as CSSProperties;

/**
 * Design tokens for designer control
 * All design values should be tokenized via CSS variables
 */

export const tokens = {
  palette: {
    bg: 'var(--color-background)',
    fg: 'var(--color-foreground)',
    accent: 'var(--color-accent)',
    frame: 'var(--color-frame)',
    ctaPrimary: 'var(--color-cta-primary)',
    ctaSecondary: 'var(--color-cta-secondary)',
  },
  motion: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  masks: {
    arc: 'mask:arc-24',
    flower: 'mask:flower-12',
    ring: 'mask:ring-16',
  },
} as const;

export type DesignTokens = typeof tokens;






















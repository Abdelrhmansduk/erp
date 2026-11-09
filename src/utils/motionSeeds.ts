import { useEffect, useState } from 'react';

/**
 * StyleSeed & Mobbin Calibrated Motion System (/ui-motion)
 * Single source of truth for the 5 personality seeds (Spring, Silk, Snap, Float, Pulse),
 * use-case motion mapping, and named motion keywords with prefers-reduced-motion support.
 */

export type MotionSeedName = 'spring' | 'silk' | 'snap' | 'float' | 'pulse';
export type MotionContext = 'entrance' | 'exit' | 'hover' | 'press' | 'layout';

export interface IMotionRecipe {
  initial?: Record<string, number | string>;
  animate?: Record<string, number | string>;
  exit?: Record<string, number | string>;
  whileHover?: Record<string, number | string>;
  whileTap?: Record<string, number | string>;
  layout?: boolean;
  transition: Record<string, number | string | number[]>;
  className?: string;
}

export type IMotionSeed = Record<MotionContext, IMotionRecipe>;

export const REDUCED_TRANSITION = {
  duration: 0.01,
  ease: 'linear',
} as const;

/**
 * 1. Silk Seed — Default for Mobbin Gallery-White Enterprise ERP
 * Smooth, composed, continuous (modals, drawers, route transitions).
 */
export const silk: IMotionSeed = {
  entrance: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
    className: 'motion-silk-enter',
  },
  exit: {
    exit: { opacity: 0, y: 4 },
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
  },
  hover: {
    whileHover: { y: -1 },
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
  press: {
    whileTap: { scale: 0.985 },
    transition: { duration: 0.12, ease: [0.22, 1, 0.36, 1] },
  },
  layout: {
    layout: true,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * 2. Snap Seed — Instant, decisive, precise (dropdowns, popovers, dense data cards, filter bars).
 */
export const snap: IMotionSeed = {
  entrance: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] },
    className: 'motion-snap-enter',
  },
  exit: {
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.1, ease: 'easeOut' },
  },
  hover: {
    whileHover: { y: -1 },
    transition: { duration: 0.12, ease: 'easeOut' },
  },
  press: {
    whileTap: { scale: 0.98 },
    transition: { duration: 0.08, ease: 'easeOut' },
  },
  layout: {
    layout: true,
    transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * 3. Spring Seed — Tactile, confident (primary pill CTA buttons, toast arrivals).
 */
export const spring: IMotionSeed = {
  entrance: {
    initial: { opacity: 0, scale: 0.94, y: 6 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { type: 'spring', stiffness: 320, damping: 24 },
  },
  exit: {
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.14, ease: 'easeIn' },
  },
  hover: {
    whileHover: { scale: 1.01 },
    transition: { type: 'spring', stiffness: 380, damping: 22 },
  },
  press: {
    whileTap: { scale: 0.97 },
    transition: { type: 'spring', stiffness: 420, damping: 20 },
    className: 'motion-spring-press',
  },
  layout: {
    layout: true,
    transition: { type: 'spring', stiffness: 300, damping: 26 },
  },
};

/**
 * 4. Float Seed — Gentle, ambient (empty-state illustrations, onboarding cards).
 */
export const float: IMotionSeed = {
  entrance: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
  },
  exit: {
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  hover: {
    whileHover: { y: -2 },
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  press: {
    whileTap: { scale: 0.99 },
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  layout: {
    layout: true,
    transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] },
  },
};

/**
 * 5. Pulse Seed — Rhythmic status indicators (live SLA/ZATCA/Musaned connection dots).
 */
export const pulse: IMotionSeed = {
  entrance: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.12, ease: 'easeIn' },
  },
  hover: {
    whileHover: { scale: 1.04 },
    transition: { duration: 0.16, ease: 'easeOut' },
  },
  press: {
    whileTap: { scale: 0.95 },
    transition: { duration: 0.1, ease: 'easeOut' },
  },
  layout: {
    layout: true,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

export const MOTION_SEEDS: Record<MotionSeedName, IMotionSeed> = {
  silk,
  snap,
  spring,
  float,
  pulse,
};

/**
 * Use-case -> Motion recommendation table (/ui-motion)
 * Note: Number / balance / KPI / price reveal uses 'none' so payload is never delayed.
 */
export const MOTION_BY_USECASE = {
  'primary-cta': spring.press,
  'modal-enter': silk.entrance,
  'dropdown-enter': snap.entrance,
  'toast-enter': spring.entrance,
  'card-hover': snap.hover,
  'route-enter': silk.entrance,
  'kpi-balance-reveal': null,
} as const;

/**
 * Named motion keywords library (/ui-motion)
 */
export const MOTION_BY_KEY = {
  'toggle-flip': { className: 'transition-transform duration-200 ease-out' },
  'toggle-slide': { className: 'transition-all duration-150 ease-out' },
  'toggle-morph': { className: 'transition-all duration-200 rounded-full' },
  'toggle-curtain': { className: 'transition-all duration-200 origin-top' },
  'reveal-blur': { className: 'motion-silk-enter' },
  'reveal-rise': { className: 'motion-silk-enter' },
  'reveal-unfold': { className: 'transition-all duration-200 origin-top' },
  'pop-in': { className: 'motion-pop-in' },
  'press-squish': { className: 'active:scale-[0.97] transition-transform duration-100' },
  'tap-ripple': { className: 'active:bg-[#eaeaea] transition-colors duration-150' },
  'pulse-beat': { className: 'motion-pulse-beat' },
  'wiggle': { className: 'motion-wiggle' },
  'shimmer': { className: 'motion-shimmer' },
  'stagger-cascade': { className: 'motion-silk-enter' },
} as const;

export const MOTION_LIBRARY = Object.entries(MOTION_BY_KEY).map(([key, recipe]) => ({
  key,
  ...recipe,
}));

/**
 * Hook that detects OS-level `prefers-reduced-motion: reduce` setting.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return reduced;
}

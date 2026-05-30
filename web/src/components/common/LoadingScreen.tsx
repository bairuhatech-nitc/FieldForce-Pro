/**
 * LoadingScreen.tsx — FieldForce Pro
 *
 * Production-ready website loading screen component.
 *
 * Features:
 *  • Liquid-fill animation driven by a `progress` prop (0–100)
 *  • CSS clip-path: inset() fills the logo from bottom to top
 *  • Smooth 0.25s transition — no jitter when progress updates rapidly
 *  • Full light / dark theme support via body.dark class
 *  • Auto fade-out + unmount when progress reaches 100
 *  • Accepts an optional `onComplete` callback
 *
 * Usage:
 * ─────────────────────────────────────────────
 * // Static (controlled externally):
 * <LoadingScreen progress={progress} onComplete={() => setLoading(false)} />
 *
 * // Self-managed demo mode (mock interval built-in):
 * <LoadingScreen demo />
 * ─────────────────────────────────────────────
 *
 * Developer integration note:
 *   To sync with real loading:
 *     const [progress, setProgress] = useState(0);
 *     // Fire setProgress(n) as assets / API calls resolve.
 *     // When all done, call setProgress(100).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import './LoadingScreen.css';

/* ─────────────────────────────────────────────────────────────────
   SVG PATHS (inline, no external assets)
───────────────────────────────────────────────────────────────── */

/**
 * Squircle: 190×190 rounded rect centred in a 200×200 viewBox.
 * rx=48 approximates the smooth squircle curvature from the logo.
 */
const SQUIRCLE_PROPS = {
  x: 5,
  y: 5,
  width: 190,
  height: 190,
  rx: 48,
  ry: 48,
} as const;

/**
 * Lightning bolt path — traced to match the logo image.
 * Coordinate space: 200×200 viewBox.
 *
 * Path breakdown:
 *   M 128,22   → top-right corner of upper wing
 *   L 60,110   → middle-left apex
 *   L 99,110   → inner notch step-right
 *   L 75,180   → bottom tip
 *   L 142,90   → bottom-right, sweeps up-right
 *   L 103,90   → inner notch step-left (upper)
 *   Z          → closes back to 128,22 (right edge of upper wing)
 */
const BOLT_PATH = 'M 128 22 L 60 110 L 99 110 L 75 180 L 142 90 L 103 90 Z';

/* ─────────────────────────────────────────────────────────────────
   LOADING MESSAGES  (cycled while progress < 100)
───────────────────────────────────────────────────────────────── */
const LOADING_MESSAGES = [
  'Initialising workspace…',
  'Loading your data…',
  'Syncing field agents…',
  'Preparing dashboard…',
  'Almost ready…',
];

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */
export interface LoadingScreenProps {
  /**
   * Current loading progress, 0–100.
   * When this reaches 100 the overlay will fade out and unmount.
   */
  progress?: number;

  /**
   * Demo/self-managed mode.
   * When true the component runs its own mock progress interval
   * so you can preview it without wiring up external state.
   */
  demo?: boolean;

  /**
   * Fired once the fade-out transition completes and the
   * component has fully unmounted from the DOM.
   */
  onComplete?: () => void;

  /**
   * Optional CSS class added to the overlay root.
   */
  className?: string;
}

/* ─────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────── */
export function LoadingScreen({
  progress: externalProgress,
  demo = false,
  onComplete,
  className = '',
}: LoadingScreenProps) {

  /* ── State ────────────────────────────────────────────────────── */
  const [internalProgress, setInternalProgress] = useState(0);
  const [isFading, setIsFading]   = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [msgIndex, setMsgIndex]   = useState(0);

  /* Determine which progress value to use */
  const rawProgress = demo ? internalProgress : (externalProgress ?? 0);
  const progress    = Math.min(100, Math.max(0, rawProgress));

  /* ── Theme detection ──────────────────────────────────────────── */
  const isDark = document.body.classList.contains('dark');

  /* ── Demo: mock progress interval ────────────────────────────── */
  useEffect(() => {
    if (!demo) return;

    let current = 0;
    const id = setInterval(() => {
      // Simulate realistic loading: fast at start, slows near end
      const increment =
        current < 30 ? Math.random() * 6 + 3   // 3–9% per tick (fast)
        : current < 70 ? Math.random() * 4 + 2 // 2–6% per tick (medium)
        : current < 90 ? Math.random() * 2 + 1 // 1–3% per tick (slow)
        : Math.random() * 1 + 0.5;             // 0.5–1.5% per tick (crawl)

      current = Math.min(100, current + increment);
      setInternalProgress(current);

      if (current >= 100) clearInterval(id);
    }, 150);

    return () => clearInterval(id);
  }, [demo]);

  /* ── Cycle loading message ────────────────────────────────────── */
  useEffect(() => {
    if (progress >= 100) return;
    const id = setInterval(() => {
      setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [progress]);

  /* ── Fade-out when complete ───────────────────────────────────── */
  useEffect(() => {
    if (progress < 100) return;

    // Brief pause at 100% before fading
    const pauseId = setTimeout(() => {
      setIsFading(true);

      // Wait for CSS fade-out transition (0.65s) then unmount
      const unmountId = setTimeout(() => {
        setIsMounted(false);
        onComplete?.();
      }, 680);

      return () => clearTimeout(unmountId);
    }, 350);

    return () => clearTimeout(pauseId);
  }, [progress, onComplete]);

  /* ── Bail early if unmounted ──────────────────────────────────── */
  if (!isMounted) return null;

  /* ──────────────────────────────────────────────────────────────
     LIQUID-FILL CLIP PATH
     ─────────────────────────────────────────────────────────────
     CSS  clip-path: inset(top right bottom left)
     Top inset = (100 - progress)%  → starts at 100% (nothing visible)
                                       ends   at 0%   (fully visible)
     The SVG fill layer is revealed from the BOTTOM upward as
     the top inset shrinks.
  ────────────────────────────────────────────────────────────── */
  const topInset  = (100 - progress).toFixed(3);
  const fillClip  = `inset(${topInset}% 0% 0% 0%)`;

  /* ── Glow intensity grows with progress ───────────────────────── */
  const glowActive = progress > 10;

  return (
    <div
      className={[
        'ls-overlay',
        isDark ? 'ls-theme-dark' : 'ls-theme-light',
        isFading ? 'ls-is-fading' : '',
        className,
      ].filter(Boolean).join(' ')}
      role="status"
      aria-label={`Loading FieldForce Pro, ${Math.round(progress)} percent complete`}
      aria-live="polite"
    >
      <div className="ls-content">

        {/* ── Logo ───────────────────────────────────────────────── */}
        <div className={`ls-logo-wrapper ${glowActive ? 'ls-glow-active' : ''}`}>

          {/* Breathing pulse rings (decorative) */}
          <div className="ls-pulse-ring" aria-hidden="true" />
          <div className="ls-pulse-ring" aria-hidden="true" />

          {/* ── LAYER 1: Outline SVG (always visible) ────────────── */}
          <svg
            className="ls-svg-outline"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Squircle outline */}
            <rect
              className="ls-squircle-outline"
              {...SQUIRCLE_PROPS}
            />
            {/* Bolt outline */}
            <path
              className="ls-bolt-outline"
              d={BOLT_PATH}
            />
          </svg>

          {/* ── LAYER 2: Fill SVG (clipped bottom-to-top) ────────── */}
          <div
            className="ls-fill-clip-wrapper"
            style={{ clipPath: fillClip }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', height: '100%' }}
            >
              {/* Blue squircle fill */}
              <rect
                className="ls-squircle-fill"
                {...SQUIRCLE_PROPS}
              />
              {/* White bolt fill — sits on top of the blue */}
              <path
                className="ls-bolt-fill"
                d={BOLT_PATH}
              />
            </svg>
          </div>
        </div>

        {/* ── Brand text ─────────────────────────────────────────── */}
        <div className="ls-meta">
          <span className="ls-brand-name">FieldForce Pro</span>
          <span className="ls-tagline">Field Service Management</span>
        </div>

        {/* ── Progress row ───────────────────────────────────────── */}
        <div className="ls-progress-row">
          {/* Thin progress bar */}
          <div className="ls-bar-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="ls-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Percentage + status message */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="ls-percentage">{Math.round(progress)}%</span>
            <span className="ls-status-msg">
              {progress >= 100 ? 'Ready!' : LOADING_MESSAGES[msgIndex]}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HOOK — useLoadingProgress
   ─────────────────────────────────────────────────────────────────
   Provides a clean API for tracking multiple async tasks and
   computing an aggregate progress value.

   Example:
   ──────────────────────────────────────────────────────────────
   const { progress, trackPromise } = useLoadingProgress();

   useEffect(() => {
     trackPromise(fetchUser(),         { weight: 40 });
     trackPromise(fetchConfig(),       { weight: 20 });
     trackPromise(preloadAssets(),     { weight: 40 });
   }, []);

   return <LoadingScreen progress={progress} />;
   ──────────────────────────────────────────────────────────────
*/
interface TrackOptions {
  /** Relative weight of this task (default 1). Higher = more progress impact. */
  weight?: number;
}

export function useLoadingProgress() {
  const tasksRef  = useRef<Map<symbol, { done: boolean; weight: number }>>(new Map());
  const [progress, setProgress] = useState(0);

  const recalculate = useCallback(() => {
    const tasks    = Array.from(tasksRef.current.values());
    const total    = tasks.reduce((s, t) => s + t.weight, 0);
    const done     = tasks.reduce((s, t) => s + (t.done ? t.weight : 0), 0);
    const pct      = total === 0 ? 0 : Math.round((done / total) * 100);
    setProgress(pct);
  }, []);

  const trackPromise = useCallback(
    <T,>(promise: Promise<T>, options: TrackOptions = {}): Promise<T> => {
      const key    = Symbol();
      const weight = options.weight ?? 1;

      tasksRef.current.set(key, { done: false, weight });
      recalculate();

      promise
        .catch(() => {/* absorb errors — don't stall the loader */})
        .finally(() => {
          const task = tasksRef.current.get(key);
          if (task) {
            tasksRef.current.set(key, { ...task, done: true });
            recalculate();
          }
        });

      return promise;
    },
    [recalculate]
  );

  /**
   * Manually advance progress by a fixed amount.
   * Useful for steps that don't return a Promise.
   */
  const advance = useCallback((amount: number) => {
    setProgress(prev => Math.min(100, prev + amount));
  }, []);

  /**
   * Force progress to 100 (e.g. after a timeout fallback).
   */
  const complete = useCallback(() => setProgress(100), []);

  return { progress, trackPromise, advance, complete };
}

export default LoadingScreen;

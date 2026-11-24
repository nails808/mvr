import { Capacitor } from '@capacitor/core';

/** Device + display-mode helpers for install / mobile gate */

export type MobilePlatform = 'ios' | 'android' | 'other';

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  } catch {
    /* ignore */
  }
  // iOS Safari
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;

  // Chromium opens an installed Android WebAPK from the Android app context.
  // This is primarily present during launch, while display-mode is being applied.
  if (document.referrer.startsWith('android-app://')) return true;
  return false;
}

export function isNativeCapacitor(): boolean {
  try {
    // Do not rely on window.Capacitor. It is not guaranteed to be exposed by
    // every Capacitor Android WebView configuration.
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** True when the full app UI may run (installed PWA or native shell). */
export function canRunFullApp(): boolean {
  return isNativeCapacitor() || isStandaloneDisplay();
}

export function getMobilePlatform(): MobilePlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  // iPadOS 13+ desktop UA with touch
  if (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1)
  ) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/**
 * Treat phones and typical mobile UA / touch+narrow viewports as mobile.
 * Desktop and large non-touch screens are blocked.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (isNativeCapacitor()) return true;

  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  // Touch laptop with wide screen → not mobile for our gate
  const touch = (navigator.maxTouchPoints || 0) > 0;
  const narrow = window.innerWidth > 0 && window.innerWidth <= 820;
  if (touch && narrow) return true;

  return false;
}

export type GateState = 'desktop' | 'install' | 'app';

function hasRecordedAndroidInstall(): boolean {
  if (getMobilePlatform() !== 'android') return false;
  try {
    return window.localStorage.getItem('myvicroads-pwa-installed') === 'true';
  } catch {
    return false;
  }
}

export function resolveGateState(): GateState {
  if (canRunFullApp()) return 'app';
  // `appinstalled` records a completed Chrome install. It covers Android
  // launches where Chromium briefly reports browser display-mode while the
  // WebAPK is starting; it is not an authorisation or security decision.
  if (hasRecordedAndroidInstall()) return 'app';
  if (!isMobileDevice()) return 'desktop';
  return 'install';
}

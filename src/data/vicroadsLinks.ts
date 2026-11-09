/**
 * Official VicRoads online-services deep links.
 * Base: https://www.vicroads.vic.gov.au
 *
 * In Capacitor APK: opens via Capacitor Browser (in-app browser).
 * In pure PWA: same as privacy policy — target="_blank" anchor.
 */
import { Capacitor } from '@capacitor/core';

export const VICROADS_ORIGIN = 'https://www.vicroads.vic.gov.au';

export const VicRoadsPaths = {
  licenceRenewal: '/online-services/personal/my-account/licence-renewal?lic=DL',
  driverHistoryReport: '/online-services/personal/my-account/driver-history-report',
  updateAddress: '/online-services/personal/my-account/profile-and-settings?a=addresses',
  myLearners: '/online-services/personal/my-account/mylearners-terms-and-conditions',
  replaceLicence: '/online-services/personal/my-account/licence-replacement',
  managePaymentMethods:
    '/online-services/personal/my-account/paymentsandtransactionhistory/manage-payment-methods',
  directDebit:
    '/online-services/personal/my-account/paymentsandtransactionhistory/recurring-payments',
  transactionHistory:
    '/online-services/personal/my-account/paymentsandtransactionhistory/transaction-history',
  personalInformation: '/online-services/personal/my-account/profile-and-settings?a=profile',
  addresses: '/online-services/personal/my-account/profile-and-settings?a=addresses',
  securitySettings: '/online-services/personal/my-account/profile-and-settings?a=security',
  privacy: '/privacy',
} as const;

export type VicRoadsPathKey = keyof typeof VicRoadsPaths;

export function vicroadsUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${VICROADS_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function openVicRoads(path: string): Promise<void> {
  const url = vicroadsUrl(path);

  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch {
      /* fall through */
    }
  }

  // Same as privacy policy <a target="_blank" rel="noopener noreferrer">
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

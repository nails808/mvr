/**
 * Official VicRoads online-services deep links opened from in-app buttons.
 * Base: https://www.vicroads.vic.gov.au
 *
 * Opens the same way as the privacy policy link on View licence:
 * <a href="..." target="_blank" rel="noopener noreferrer">
 */
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

/**
 * Same navigation as the privacy policy <a target="_blank" rel="noopener noreferrer">.
 * Uses a temporary anchor so iOS / installed PWA behaviour matches real links.
 */
export function openVicRoads(path: string): void {
  const url = vicroadsUrl(path);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  // Required for some WebKit builds to treat as user-activated navigation
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

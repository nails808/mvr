/** Bottom navigation destinations — APK bottom_bar_* labels (+ Home) */
export type NavTab = 'Home' | 'Licence' | 'Vehicles' | 'Payments' | 'Profile';

/** Order matches product emphasis: Home, then Licence / Vehicles / Payments / Profile */
export const NAV_TABS: NavTab[] = ['Home', 'Licence', 'Vehicles', 'Payments', 'Profile'];

/** Stack destinations pushed on top of a tab */
export type StackDest =
  | 'viewlicence'
  | 'demerit'
  | 'myVehicles'
  | 'qrScanner'
  | 'cameraPermission'
  | null;

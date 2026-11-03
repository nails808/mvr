/** Bottom navigation destinations — matches original NavTab enum */
export type NavTab = 'Home' | 'Vehicles' | 'Licence' | 'Payments' | 'Profile';

export const NAV_TABS: NavTab[] = ['Home', 'Vehicles', 'Licence', 'Payments', 'Profile'];

/** Stack destinations pushed on top of a tab */
export type StackDest =
  | 'viewlicence'
  | 'demerit'
  | 'myVehicles'
  | null;

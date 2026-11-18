import type { StackDest } from '../components/NavTab';
import { MenuCard, type MenuItem } from '../components/MenuCard';
import { openVicRoads, VicRoadsPaths } from '../data/vicroadsLinks';
import '../components/MenuCard.css';

interface VehiclesScreenProps {
  onNavigate: (dest: StackDest) => void;
}

/**
 * Vehicles hub — APK vehicles_screen_* menu structure.
 * "My registered vehicles" retains in-app navigation to the detail list.
 */
const ITEMS: MenuItem[] = [
  {
    id: 'registered',
    title: 'My registered vehicles',
    subtitle: 'View all registered vehicles',
    action: 'myVehicles',
  },
  {
    id: 'renewal',
    title: 'Manage registration renewal',
    subtitle: "Renew your registration when it's due",
    action: 'web:regoRenewal',
  },
  {
    id: 'reports',
    title: 'My vehicle reports',
    subtitle: 'Order and view vehicle reports',
    action: 'web:vehicleReports',
  },
  {
    id: 'garage',
    title: 'Change your garage address',
    action: 'web:garageAddress',
  },
  {
    id: 'permits',
    title: 'Unregistered vehicle permits',
    action: 'web:unregisteredPermits',
  },
  {
    id: 'apprentice',
    title: 'Apprentice registration discount',
    action: 'web:apprenticeDiscount',
  },
];

const WEB_PATHS: Record<string, string> = {
  'web:regoRenewal': VicRoadsPaths.registrationRenewal,
  'web:vehicleReports': '/online-services/personal/my-account',
  'web:garageAddress': VicRoadsPaths.addresses,
  'web:unregisteredPermits': '/online-services/personal/my-account',
  'web:apprenticeDiscount': '/online-services/personal/my-account',
};

export function VehiclesScreen({ onNavigate }: VehiclesScreenProps) {
  const onItemClick = (item: MenuItem) => {
    if (item.action === 'myVehicles') {
      onNavigate('myVehicles');
      return;
    }
    if (item.action && item.action.startsWith('web:')) {
      const path = WEB_PATHS[item.action];
      if (path) void openVicRoads(path);
    }
  };

  return (
    <div className="menu-screen">
      <h1 className="menu-screen__title">Vehicles</h1>
      <div className="menu-screen__section">
        <MenuCard items={ITEMS} onItemClick={onItemClick} />
      </div>
    </div>
  );
}

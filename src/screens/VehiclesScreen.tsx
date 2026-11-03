import type { StackDest } from '../components/NavTab';
import { MenuCard, type MenuItem } from '../components/MenuCard';
import '../components/MenuCard.css';

interface VehiclesScreenProps {
  onNavigate: (dest: StackDest) => void;
}

const ITEMS: MenuItem[] = [
  {
    id: 'myVehicles',
    title: 'My registered vehicles',
    subtitle: 'View all registered vehicles',
    action: 'myVehicles',
  },
  {
    id: 'renew',
    title: 'Manage registration renewal',
    subtitle: "Renew your registration when it's due",
  },
  {
    id: 'reports',
    title: 'My vehicle reports',
    subtitle: 'Order driver history report',
  },
  {
    id: 'garage',
    title: 'Change your garage address',
  },
  {
    id: 'permits',
    title: 'Unregistered vehicle permits',
  },
  {
    id: 'debit',
    title: 'Direct debit registration',
  },
  {
    id: 'apprentice',
    title: 'Apprentice registration discount',
  },
];

export function VehiclesScreen({ onNavigate }: VehiclesScreenProps) {
  const onItemClick = (item: MenuItem) => {
    if (item.action === 'myVehicles') onNavigate('myVehicles');
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

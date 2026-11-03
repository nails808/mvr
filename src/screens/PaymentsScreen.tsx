import { MenuCard, type MenuItem } from '../components/MenuCard';
import '../components/MenuCard.css';

const ITEMS: MenuItem[] = [
  {
    id: 'fines',
    title: 'Pay fines',
    subtitle: 'Pay your outstanding fines',
  },
  {
    id: 'arrangements',
    title: 'Manage your payment arrangements',
    subtitle: 'Set up payment plan',
  },
  {
    id: 'history',
    title: 'Payment history',
    subtitle: 'View past payments',
  },
];

export function PaymentsScreen() {
  return (
    <div className="menu-screen">
      <h1 className="menu-screen__title">Payments</h1>
      <div className="menu-screen__section">
        <MenuCard items={ITEMS} />
      </div>
    </div>
  );
}

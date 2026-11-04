import type { StackDest } from '../components/NavTab';
import { MenuCard, type MenuItem } from '../components/MenuCard';
import '../components/MenuCard.css';

interface LicenceScreenProps {
  onNavigate: (dest: StackDest) => void;
}

const ITEMS: MenuItem[] = [
  {
    id: 'viewlicence',
    title: 'My licence',
    subtitle: 'Tap to view licence',
    action: 'viewlicence',
  },
  {
    id: 'renew',
    title: 'Manage licence renewal',
    subtitle: "Renew your licence when it's due",
  },
  {
    id: 'demerit',
    title: 'View demerit points',
    action: 'demerit',
  },
  {
    id: 'replace',
    title: 'Replace licence',
  },
  {
    id: 'address',
    title: 'Update address on licence',
  },
  {
    id: 'learners',
    title: 'Access myLearners',
  },
];

export function LicenceScreen({ onNavigate }: LicenceScreenProps) {
  const onItemClick = (item: MenuItem) => {
    if (item.action === 'viewlicence') onNavigate('viewlicence');
    else if (item.action === 'demerit') onNavigate('demerit');
  };

  return (
    <div className="menu-screen">
      <h1 className="menu-screen__title">Licence</h1>
      <div className="menu-screen__section">
        <MenuCard items={ITEMS} onItemClick={onItemClick} />
      </div>
    </div>
  );
}

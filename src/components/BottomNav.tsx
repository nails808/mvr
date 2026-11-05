import type { NavTab } from './NavTab';
import { NAV_TABS } from './NavTab';
import './BottomNav.css';

interface BottomNavProps {
  active: NavTab;
  onSelect: (tab: NavTab) => void;
}

const TAB_LABELS: Record<NavTab, string> = {
  Home: 'Home',
  Vehicles: 'Vehicles',
  Licence: 'Licence',
  Payments: 'Payments',
  Profile: 'Profile',
};

function TabIcon({ tab, active }: { tab: NavTab; active: boolean }) {
  const color = active ? (tab === 'Home' || tab === 'Profile' || tab === 'Payments' || tab === 'Licence' ? '#2E7D32' : '#1A2A3A') : '#5A6A7A';
  const size = 24;

  switch (tab) {
    case 'Home':
      // VicRoads-style V mark
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 5.5h3.2L12 18l4.8-12.5H20L13.2 20.5h-2.4L4 5.5z"
            fill={color}
          />
          <path
            d="M14.5 5.5h3.2L20 5.5"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0"
          />
          <path
            d="M15 4.5c1.2 0 2.2.4 2.8 1.1"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case 'Vehicles':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
        </svg>
      );
    case 'Licence':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
        </svg>
      );
    case 'Payments':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
          <path
            d="M12 7v10M9.5 9.5c.5-.8 1.4-1.3 2.5-1.3 1.5 0 2.5.8 2.5 2s-1 2-2.5 2h-1c-1.5 0-2.5.8-2.5 2s1 2 2.5 2c1.1 0 2-.5 2.5-1.3"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'Profile':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      );
  }
}

export function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main">
      {NAV_TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''} ${
              tab === 'Home' && isActive ? 'bottom-nav__item--home-active' : tab === 'Profile' && isActive ? 'bottom-nav__item--profile-active' : tab === 'Payments' && isActive ? 'bottom-nav__item--payments-active' : tab === 'Licence' && isActive ? 'bottom-nav__item--licence-active' : ''
            }`}
            onClick={() => onSelect(tab)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-nav__icon-wrap">
              <TabIcon tab={tab} active={isActive} />
            </span>
            <span className="bottom-nav__label">{TAB_LABELS[tab]}</span>
          </button>
        );
      })}
    </nav>
  );
}

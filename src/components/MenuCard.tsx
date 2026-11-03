import './MenuCard.css';

export type MenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  /** stack dest or special action key */
  action?: string;
};

interface MenuCardProps {
  items: MenuItem[];
  onItemClick?: (item: MenuItem) => void;
}

export function MenuCard({ items, onItemClick }: MenuCardProps) {
  return (
    <div className="menu-card">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          className={`menu-card__row ${i === items.length - 1 ? 'menu-card__row--last' : ''}`}
          onClick={() => onItemClick?.(item)}
        >
          <div className="menu-card__text">
            <div className="menu-card__title">{item.title}</div>
            {item.subtitle && <div className="menu-card__subtitle">{item.subtitle}</div>}
          </div>
          <span className="menu-card__chevron" aria-hidden>
            ›
          </span>
        </button>
      ))}
    </div>
  );
}

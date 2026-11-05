import './PaymentsScreen.css';

const ITEMS = [
  {
    id: 'methods',
    title: 'Manage payment methods',
    subtitle: 'Store your credit card and bank account details to make payments',
  },
  {
    id: 'direct-debit',
    title: 'Direct debit payments',
    subtitle: 'Manage direct debit settings',
  },
  {
    id: 'history',
    title: 'Transaction history',
    subtitle: 'View recent transactions made using your myVicRoads account',
  },
] as const;

export function PaymentsScreen() {
  return (
    <div className="payments-screen">
      <header className="payments-header">
        <h1>Payments</h1>
      </header>

      <section className="payments-card" aria-label="Payment options">
        {ITEMS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`payments-item ${index === ITEMS.length - 1 ? 'payments-item--last' : ''}`}
          >
            <span className="payments-item__title">{item.title}</span>
            <span className="payments-item__subtitle">{item.subtitle}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

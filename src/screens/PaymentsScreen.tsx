import { openVicRoads, VicRoadsPaths } from '../data/vicroadsLinks';
import './PaymentsScreen.css';

const ITEMS = [
  {
    id: 'methods',
    title: 'Manage payment methods',
    subtitle: 'Store your credit card and bank account details to make payments',
    webPath: VicRoadsPaths.managePaymentMethods,
  },
  {
    id: 'direct-debit',
    title: 'Direct debit payments',
    subtitle: 'Manage direct debit and recurring payment settings',
    webPath: VicRoadsPaths.directDebit,
  },
  {
    id: 'history',
    title: 'Transaction history',
    subtitle: 'View recent transactions made using your myVicRoads account',
    webPath: VicRoadsPaths.transactionHistory,
  },
  {
    id: 'fines',
    title: 'Fines and infringements',
    subtitle: 'View and pay outstanding fines',
    webPath: '/online-services/personal/my-account',
  },
] as const;

export function PaymentsScreen() {
  return (
    <div className="payments-screen">
      <header className="payments-header">
        <h1>Payments</h1>
      </header>

      <p className="payments-lead">
        Manage how you pay for licences, registration and other VicRoads services.
      </p>

      <section className="payments-card" aria-label="Payment options">
        {ITEMS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`payments-item ${index === ITEMS.length - 1 ? 'payments-item--last' : ''}`}
            onClick={() => openVicRoads(item.webPath)}
          >
            <span className="payments-item__body">
              <span className="payments-item__title">{item.title}</span>
              <span className="payments-item__subtitle">{item.subtitle}</span>
            </span>
            <span className="payments-item__chevron" aria-hidden>
              ›
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}

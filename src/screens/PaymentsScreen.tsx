import type { UserData } from '../data/UserData';
import './PaymentsScreen.css';

interface PaymentsScreenProps {
  userData: UserData;
}

type PaymentItem = {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  status: 'due' | 'paid' | 'none';
  dueLabel?: string;
};

export function PaymentsScreen({ userData }: PaymentsScreenProps) {
  const items: PaymentItem[] = [
    {
      id: 'licence',
      title: 'Driver licence renewal',
      subtitle: `${userData.licenceType} licence · expires ${userData.licenceExpiry}`,
      amount: '$87.60',
      status: 'none',
      dueLabel: 'Not due yet',
    },
    {
      id: 'rego',
      title: 'Vehicle registration',
      subtitle: `${userData.vehicleRego} · ${userData.vehicleDescription}`,
      amount: '$312.40',
      status: 'due',
      dueLabel: `Due ${userData.vehicleExpiry}`,
    },
    {
      id: 'history',
      title: 'Recent payment',
      subtitle: 'Licence renewal (previous period)',
      amount: '$87.60',
      status: 'paid',
      dueLabel: 'Paid',
    },
  ];

  return (
    <div className="payments-screen">
      <header className="payments-header">
        <h1>Payments</h1>
        <p className="payments-subtitle">Renewals and registration</p>
      </header>

      <section className="payments-summary">
        <div className="payments-summary__label">Outstanding</div>
        <div className="payments-summary__amount">$312.40</div>
        <div className="payments-summary__hint">Vehicle registration for {userData.vehicleRego}</div>
      </section>

      <section className="payments-section">
        <h2 className="payments-section-title">Items</h2>
        <div className="payments-list">
          {items.map((item) => (
            <article key={item.id} className="payment-card">
              <div className="payment-card__top">
                <div className="payment-card__titles">
                  <div className="payment-card__title">{item.title}</div>
                  <div className="payment-card__subtitle">{item.subtitle}</div>
                </div>
                <div className="payment-card__amount">{item.amount}</div>
              </div>
              <div className="payment-card__bottom">
                <span
                  className={`payment-badge payment-badge--${item.status}`}
                >
                  {item.dueLabel}
                </span>
                {item.status === 'due' && (
                  <button type="button" className="payment-pay-btn" disabled>
                    Pay
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="payments-footnote">
        Payment processing is not connected to VicRoads systems in this reconstruction.
        Amounts are illustrative only.
      </p>
    </div>
  );
}

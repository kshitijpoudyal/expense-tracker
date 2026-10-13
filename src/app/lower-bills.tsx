import { RequestFlow } from '@/components/request-flow';
import { recurring } from '@/data/mock';

export default function LowerBills() {
  return (
    <RequestFlow
      title="Lower your bills"
      heading="Lower your bills"
      body="Pick a bill and request a negotiation for a better rate."
      icon="receipt-outline"
      badgeIcon="arrow-down"
      tint="#F8E3D6"
      badgeColor="#B9C77A"
      actionLabel="Lower for me"
      items={recurring.filter((r) => r.negotiable)}
    />
  );
}

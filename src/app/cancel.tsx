import { RequestFlow } from '@/components/request-flow';
import { useFinance } from '@/data/finance';

export default function Cancel() {
  const { recurring } = useFinance();
  return (
    <RequestFlow
      title="Cancel subscriptions"
      heading="See what we can cancel for you"
      body="Save time and effort by having a subscription cancelled for you."
      icon="document-text-outline"
      badgeIcon="close"
      tint="#DCE6FB"
      badgeColor="#F3A9B1"
      startLabel="Start a cancellation"
      actionLabel="Cancel for me"
      items={recurring.filter((r) => r.kind === 'subscription')}
    />
  );
}

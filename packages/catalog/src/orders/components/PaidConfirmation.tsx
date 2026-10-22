import { useNavigate } from 'react-router-dom';
import { Button } from '@ticketing/ui';
import { SuccessCheckmark } from './SuccessCheckmark';

export function PaidConfirmation({ eventId }: { eventId: string }) {
  const navigate = useNavigate();

  return (
    <div className="mt-6 text-center">
      <SuccessCheckmark />
      <p className="mt-4 font-medium text-green-700">Payment confirmed</p>
      <p className="text-muted-foreground">You're all set for this event.</p>
      <Button className="mt-4" onClick={() => navigate(`/${eventId}`)}>
        Back to event
      </Button>
    </div>
  );
}

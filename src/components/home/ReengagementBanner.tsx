import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types';
import { daysSinceLastOrder } from '../../utils/weeklySummary';

type Props = {
  user: User;
};

export function ReengagementBanner({ user }: Props) {
  const navigate = useNavigate();
  const days = daysSinceLastOrder(user);

  return (
    <Card className="reengagement-banner">
      <span className="reengagement-emoji">👀</span>
      <div>
        <strong>Hace tiempo que no vienes</strong>
        <p>
          Llevas {days} días sin pedir. Tu hamburguesa favorita te echa de menos.
        </p>
      </div>
      <Button fullWidth onClick={() => navigate('/menu')}>
        Pedir ahora
      </Button>
    </Card>
  );
}

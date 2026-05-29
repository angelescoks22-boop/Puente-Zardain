import { Button } from './Button';

type Props = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorRetry({ message, onRetry, retryLabel = 'Reintentar' }: Props) {
  return (
    <div className="error-retry" role="alert">
      <p className="form-error">❌ {message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

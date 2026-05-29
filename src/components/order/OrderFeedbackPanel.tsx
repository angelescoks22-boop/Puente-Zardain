import { useState } from 'react';
import { submitOrderFeedback } from '../../api/orders';
import { Button } from '../ui/Button';

type Props = {
  orderId: string;
  alreadySubmitted?: boolean;
  onSubmitted?: () => void;
};

export function OrderFeedbackPanel({ orderId, alreadySubmitted, onSubmitted }: Props) {
  const [rating, setRating] = useState<'like' | 'dislike' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(alreadySubmitted ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (submitted) {
    return (
      <div className="order-feedback done">
        <p>✅ Gracias por tu opinión</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    setError('');
    try {
      await submitOrderFeedback(orderId, rating, comment.trim() || undefined);
      setSubmitted(true);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-feedback">
      <h3>¿Cómo fue tu experiencia?</h3>
      <div className="feedback-buttons">
        <button
          type="button"
          className={`feedback-btn ${rating === 'like' ? 'active like' : ''}`}
          onClick={() => setRating('like')}
          aria-label="Me gustó"
        >
          👍
        </button>
        <button
          type="button"
          className={`feedback-btn ${rating === 'dislike' ? 'active dislike' : ''}`}
          onClick={() => setRating('dislike')}
          aria-label="No me gustó"
        >
          👎
        </button>
      </div>
      {rating && (
        <>
          <textarea
            className="input textarea feedback-comment"
            placeholder="Comentario opcional (máx. 200 caracteres)"
            maxLength={200}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {error && <p className="form-error">{error}</p>}
          <Button onClick={handleSubmit} disabled={loading} fullWidth>
            {loading ? 'Enviando...' : 'Enviar opinión'}
          </Button>
        </>
      )}
    </div>
  );
}

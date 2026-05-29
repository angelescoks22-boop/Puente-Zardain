import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { getReviews, submitReview } from '../api/products';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { StarRating } from '../components/reviews/StarRating';
import type { Review } from '../types';
import { formatDate } from '../utils/format';
import {
  filterPositiveReviews,
  isPositiveReview,
  isReviewVerified,
  sortHomeReviews,
  type DisplayReview,
} from '../utils/reviews';

export function ReviewsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const formRef = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadReviews = () => {
    getReviews().then(setReviews).catch(() => setReviews([]));
  };

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    if (user) fetchOrders(user.id);
  }, [user, fetchOrders]);

  const positiveReviews = useMemo(() => filterPositiveReviews(reviews), [reviews]);
  const otherReviews = useMemo(
    () => sortHomeReviews(reviews.filter((review) => !isPositiveReview(review))),
    [reviews],
  );

  const hasOrders = user ? orders.some((o) => o.userId === user.id) : false;
  const isFirstReview = user && !hasSubmitted && !reviews.some((r) => r.userId === user.id);

  const handleAddReview = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowAddForm(true);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!hasOrders) {
      setMessage('Solo puedes opinar si has hecho pedidos');
      return;
    }
    setLoading(true);
    try {
      await submitReview(user.id, user.name, rating, comment, hasOrders, Boolean(isFirstReview));
      setHasSubmitted(true);
      setMessage(
        isFirstReview
          ? '¡Reseña enviada! +30 Zardas. Pendiente de validación.'
          : 'Reseña enviada. Pendiente de validación del negocio.',
      );
      await useAuthStore.getState().init();
      setComment('');
      loadReviews();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const renderReviewList = (items: DisplayReview[]) =>
    items.map((review, index) => (
      <ReviewCard
        key={review.id}
        rating={review.rating}
        comment={review.comment}
        user={review.userName}
        verified={isReviewVerified(review)}
        style={{ animationDelay: `${index * 0.06}s` }}
      />
    ));

  return (
    <div className="page reviews-page">
      <div className="reviews-page-header">
        <div>
          <h1>⭐ Reseñas</h1>
          <p className="hint">Opiniones reales de clientes de Puente Zardain</p>
        </div>
        <Button size="sm" onClick={handleAddReview}>
          Añadir reseña
        </Button>
      </div>

      <section className="section">
        {reviews.length === 0 ? (
          <Card>
            <p className="hint">Aún no hay reseñas publicadas. ¡Sé el primero!</p>
            <Button fullWidth onClick={handleAddReview}>Añadir reseña</Button>
          </Card>
        ) : (
          <div className="reviews-list">{renderReviewList(sortHomeReviews(reviews))}</div>
        )}
      </section>

      {showAddForm && (
        <div ref={formRef}>
          {user ? (
            <Card>
              <div className="review-form-header">
                <h3>Deja tu opinión</h3>
                <button type="button" className="link-btn" onClick={() => setShowAddForm(false)}>
                  Cerrar
                </button>
              </div>
              {!hasOrders ? (
                <p className="hint">Haz al menos un pedido para poder opinar</p>
              ) : (
                <form onSubmit={handleSubmit} className="review-form">
                  <div className="rating-row">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`star-btn ${rating >= n ? 'active' : ''}`}
                        onClick={() => setRating(n)}
                        aria-label={`${n} estrellas`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input textarea"
                    placeholder="Cuéntanos tu experiencia..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    minLength={10}
                  />
                  {isFirstReview && <p className="promo-hint">🎁 Primera reseña: +30 Zardas</p>}
                  {message && <p className="form-message">{message}</p>}
                  <Button fullWidth disabled={loading}>Enviar reseña</Button>
                </form>
              )}
            </Card>
          ) : (
            <Card className="auth-cta">
              <p>Inicia sesión para dejar tu reseña</p>
              <Button fullWidth onClick={() => navigate('/auth')}>Entrar</Button>
            </Card>
          )}
        </div>
      )}

      {positiveReviews.length > 0 && otherReviews.length > 0 && (
        <section className="section">
          <h2>Otras valoraciones</h2>
          <p className="hint reviews-other-hint">
            Valoraciones de 1 a 3 estrellas (no se muestran en la home).
          </p>
          <div className="reviews-list reviews-list-other">
            {otherReviews.map((review) => (
              <Card key={review.id} className="review-item review-item-muted">
                <div className="review-header">
                  <strong>{review.userName}</strong>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <p>{review.comment}</p>
                {isReviewVerified(review) && (
                  <span className="review-verified-badge">✅ Pedido verificado</span>
                )}
                <small>{formatDate(review.createdAt)}</small>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

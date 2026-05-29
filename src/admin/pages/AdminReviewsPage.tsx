import { useCallback, useState } from 'react';
import { adminApi, useAdminPoll, type AdminReview } from '../api/adminApi';

const REVIEW_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'good', label: '⭐ 4-5' },
  { id: 'bad', label: '⚠️ 1-2' },
  { id: 'featured', label: 'Destacadas' },
] as const;

type ReviewFilter = (typeof REVIEW_FILTERS)[number]['id'];

function ReviewCard({ review, onUpdate }: { review: AdminReview; onUpdate: () => void }) {
  const [reply, setReply] = useState(review.adminResponse ?? '');
  const [saving, setSaving] = useState(false);

  const saveReply = async () => {
    setSaving(true);
    try {
      await adminApi.updateReview(review.id, { adminResponse: reply.trim(), approved: true });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async () => {
    await adminApi.updateReview(review.id, { featured: !review.featured });
    onUpdate();
  };

  return (
    <div className={`stat-card review-admin-card ${review.featured ? 'review-featured' : ''}`}>
      <div className="review-admin-header">
        <strong>{review.userName}</strong>
        <span>{'⭐'.repeat(review.rating)}</span>
        {review.featured && <span className="featured-badge">Destacada</span>}
      </div>
      <p>{review.comment}</p>
      <p className="hint">{new Date(review.createdAt).toLocaleString('es-ES')}</p>
      <p style={{ color: review.approved ? '#16a34a' : '#f59e0b' }}>
        {review.approved ? '✓ Aprobada' : '⏳ Pendiente de moderación'}
      </p>

      {review.adminResponse && (
        <div className="admin-review-response">
          <strong>Respuesta del local:</strong>
          <p>{review.adminResponse}</p>
        </div>
      )}

      <textarea
        className="input"
        rows={2}
        placeholder="Escribe una respuesta pública..."
        value={reply}
        onChange={(e) => setReply(e.target.value)}
      />

      <div className="review-admin-actions">
        {!review.approved && (
          <>
            <button type="button" className="status-btn" onClick={() => adminApi.approveReview(review.id, true).then(onUpdate)}>
              Aprobar
            </button>
            <button type="button" className="status-btn" onClick={() => adminApi.approveReview(review.id, false).then(onUpdate)}>
              Rechazar
            </button>
          </>
        )}
        <button type="button" className="status-btn" disabled={saving || !reply.trim()} onClick={saveReply}>
          {saving ? 'Guardando…' : 'Responder y aprobar'}
        </button>
        <button type="button" className="status-btn" onClick={toggleFeatured}>
          {review.featured ? 'Quitar destacada' : '⭐ Destacar'}
        </button>
      </div>
    </div>
  );
}

export function AdminReviewsPage() {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const fetcher = useCallback(() => adminApi.getReviews(filter), [filter]);
  const { data: reviews, refresh } = useAdminPoll(fetcher, 10000);

  return (
    <div>
      <h2>⭐ Gestión de reseñas</h2>
      <p className="hint">Modera, responde y destaca las mejores reseñas en la web.</p>

      <div className="admin-filter-bar">
        {REVIEW_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`filter-chip ${filter === id ? 'active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-grid" style={{ marginTop: 16 }}>
        {reviews?.length === 0 && <p>No hay reseñas con este filtro</p>}
        {reviews?.map((r) => (
          <ReviewCard key={r.id} review={r} onUpdate={refresh} />
        ))}
      </div>
    </div>
  );
}

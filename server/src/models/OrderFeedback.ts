export type FeedbackRating = 'like' | 'dislike';

export interface IOrderFeedback {
  id: string;
  orderId: string;
  userId: string;
  rating: FeedbackRating;
  comment?: string;
  createdAt: Date;
}

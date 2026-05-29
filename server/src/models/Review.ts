export interface IReview {
  id: string;
  userId: string;
  userName: string;
  productId?: string;
  rating: number;
  comment: string;
  approved: boolean;
  verified: boolean;
  adminResponse?: string;
  featured?: boolean;
  createdAt: Date;
}

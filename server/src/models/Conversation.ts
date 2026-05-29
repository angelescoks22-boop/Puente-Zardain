export type ConversationStatus = 'active' | 'closed' | 'open';

export interface IConversation {
  id: string;
  userId: string;
  userName: string;
  orderId?: string;
  status: ConversationStatus;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: Date;
  updatedAt?: Date;
}

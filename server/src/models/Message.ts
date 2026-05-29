export type MessageSender = 'user' | 'admin' | 'system';

export interface IMessage {
  id: string;
  conversationId: string;
  sender: MessageSender;
  message: string;
  read: boolean;
  isAutomated?: boolean;
  createdAt: Date;
}

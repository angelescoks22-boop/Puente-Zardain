export interface IBusinessMessage {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'promo';
  active: boolean;
  createdAt?: Date;
}

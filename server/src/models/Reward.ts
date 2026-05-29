export interface IReward {
  id: string;
  name: string;
  description: string;
  zardasCost: number;
  icon: string;
  active: boolean;
  createdAt?: Date;
}

export type UserRole = 'client' | 'admin';
export type UserLevel = 'hierro' | 'bronce' | 'plata' | 'oro' | 'platino' | 'diamante';
export type ClientStatus = 'normal' | 'reliable' | 'problematic' | 'blocked';

export interface IUserAddress {
  id?: string;
  fullAddress: string;
  city: string;
  lat: number;
  lng: number;
  placeId?: string;
  label?: string;
  portal?: string;
  floor?: string;
  door?: string;
  details?: string;
  isDefault: boolean;
}

export interface IUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: UserRole;
  address?: string;
  addresses: IUserAddress[];
  zardas: number;
  level: UserLevel;
  levelProgress: number;
  orderCount: number;
  streak: number;
  lastOrderDate?: Date;
  isBlocked: boolean;
  noShowCount: number;
  phoneVerified: boolean;
  clientStatus: ClientStatus;
  favoriteProductId?: string;
  profileAvatar?: string;
  profileColor?: string;
  profileTagline?: string;
  profileFrame?: string;
  birthday?: Date;
  birthdayRewardClaimedYear?: number;
  birthdayFreeProductPending?: boolean;
  passwordUserSet?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

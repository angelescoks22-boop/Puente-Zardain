export type Category =
  | 'hamburguesas'
  | 'bocadillos'
  | 'montados'
  | 'raciones'
  | 'bebidas'
  | 'tostas'
  | 'sandwiches'
  | 'ensaladas';

export type Ingredient = {
  id: string;
  name: string;
  required: boolean;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  ingredients: Ingredient[];
  popular?: boolean;
  featured?: boolean;
};

export type CartItem = {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  removedIngredients: string[];
  unitPrice: number;
};

export type OrderType = 'pickup' | 'delivery';
export type PaymentMethod = 'cash' | 'card';
export type OrderStatus = 'received' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  type: OrderType;
  paymentMethod: PaymentMethod;
  cashPaidAmount?: number;
  cashChange?: number;
  address?: string;
  deliveryAddress?: DeliveryAddress;
  status: OrderStatus;
  queuePosition: number;
  feedbackSubmitted?: boolean;
  createdAt: string;
  completedAt?: string;
  pickedUp: boolean;
};

export type UserLevel = 'hierro' | 'bronce' | 'plata' | 'oro' | 'platino' | 'diamante';

export type DeliveryDetailsFields = {
  portal?: string;
  floor?: string;
  door?: string;
  details?: string;
};

export type DeliveryAddress = {
  fullAddress: string;
  city: string;
  lat: number;
  lng: number;
  placeId?: string;
} & DeliveryDetailsFields;

export type UserAddress = {
  id: string;
  fullAddress: string;
  city: string;
  lat: number;
  lng: number;
  placeId?: string;
  label?: string;
  isDefault: boolean;
} & DeliveryDetailsFields;

export type ValidatedAddress = Omit<UserAddress, 'id' | 'isDefault' | 'label'> & {
  label?: string;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role?: 'client' | 'admin';
  address?: string;
  addresses?: UserAddress[];
  zardas: number;
  level: UserLevel;
  levelProgress: number;
  orderCount: number;
  favoriteProductId?: string;
  streak: number;
  lastOrderDate?: string;
  isBlocked: boolean;
  noShowCount: number;
  phoneVerified: boolean;
  birthday?: string;
  birthdayRewardClaimedYear?: number;
  birthdayFreeProductPending?: boolean;
  profileAvatar?: string;
  profileColor?: string;
  profileTagline?: string;
  profileFrame?: string;
  createdAt: string;
};

export type Review = {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  approved: boolean;
  verified: boolean;
  productId?: string;
  createdAt: string;
};

export type FavoriteOrder = {
  id: string;
  name: string;
  items: Omit<CartItem, 'id'>[];
  createdAt: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type BusinessMessage = {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'promo';
  active: boolean;
};

export type Reward = {
  id: string;
  name: string;
  description: string;
  zardasCost: number;
  icon: string;
};

export type LevelInfo = {
  id: UserLevel;
  name: string;
  minOrders: number;
  color: string;
  benefits: string[];
};

export type AuthResponse = {
  user: User;
  token: string;
  role?: 'client' | 'admin';
};

export type ApiError = {
  message: string;
  code?: string;
};

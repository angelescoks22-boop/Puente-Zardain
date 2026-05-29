export interface IIngredient {
  id: string;
  name: string;
  required: boolean;
}

export interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'hamburguesas' | 'bocadillos' | 'montados' | 'raciones' | 'bebidas' | 'tostas' | 'sandwiches' | 'ensaladas';
  image: string;
  ingredients: IIngredient[];
  popular: boolean;
  featured: boolean;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

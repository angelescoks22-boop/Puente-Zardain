type Ingredient = { id: string; name: string; required: boolean };

const burgerIngredients: Ingredient[] = [
  { id: 'carne', name: 'Carne', required: true },
  { id: 'pan', name: 'Pan', required: true },
  { id: 'queso', name: 'Queso', required: false },
  { id: 'lechuga', name: 'Lechuga', required: false },
  { id: 'tomate', name: 'Tomate', required: false },
  { id: 'cebolla', name: 'Cebolla', required: false },
  { id: 'salsa', name: 'Salsa especial', required: false },
];

const defaultIngredients: Ingredient[] = [{ id: 'base', name: 'Ración estándar', required: true }];

type ItemDef = {
  name: string;
  price: number;
  category: 'hamburguesas' | 'bocadillos' | 'montados' | 'raciones' | 'bebidas' | 'tostas' | 'sandwiches' | 'ensaladas';
  description?: string;
  image?: string;
  popular?: boolean;
  featured?: boolean;
  houseSelection?: boolean;
  ingredients?: Ingredient[];
};

function item(def: ItemDef) {
  const descParts: string[] = [];
  if (def.houseSelection) descParts.push('⭐ Selección de la casa');
  if (def.description) descParts.push(def.description);

  return {
    name: def.name,
    price: def.price,
    category: def.category,
    description: descParts.join(' · ') || def.name,
    image: def.image ?? categoryEmoji(def.category),
    ingredients: def.ingredients ?? defaultIngredients,
    popular: def.popular ?? false,
    featured: def.featured ?? def.houseSelection ?? false,
    active: true,
  };
}

function categoryEmoji(cat: ItemDef['category']) {
  const map: Record<ItemDef['category'], string> = {
    hamburguesas: '🍔',
    bocadillos: '🥖',
    montados: '🍞',
    raciones: '🍽️',
    bebidas: '🥤',
    tostas: '🫓',
    sandwiches: '🥪',
    ensaladas: '🥗',
  };
  return map[cat];
}

const burgerNote = 'Disponible también en pollo empanado';

export const seedProducts = [
  // ⭐ Selección de la casa
  item({ name: 'Huevos rotos con jamón o morcilla', price: 10, category: 'raciones', houseSelection: true, featured: true }),
  item({ name: 'Patatas CheeseBacon', price: 9, category: 'raciones', houseSelection: true, featured: true, popular: true }),
  item({ name: 'Croquetas de jamón (8 uds)', price: 9, category: 'raciones', houseSelection: true, featured: true }),

  // Raciones
  item({ name: 'Braviolis', price: 7.5, category: 'raciones' }),
  item({ name: 'Huevos rotos con gulas', price: 10.5, category: 'raciones' }),
  item({ name: 'Queso frito con mermelada (8 uds)', price: 9.5, category: 'raciones' }),
  item({ name: 'Oreja a la plancha (con salsa brava)', price: 10, category: 'raciones' }),
  item({ name: 'Callos', price: 10, category: 'raciones', description: '🌶️ Picante' }),
  item({ name: 'Tiras de pollo con ali-oli', price: 9.5, category: 'raciones' }),
  item({ name: 'Morcilla', price: 8.5, category: 'raciones' }),
  item({ name: 'Alitas de pollo (6 uds)', price: 9, category: 'raciones', popular: true }),
  item({ name: 'Rulo de cabra con cebolla caramelizada', price: 10, category: 'raciones', description: '🌱 Vegetariano' }),
  item({ name: 'Gambas al ajillo', price: 11, category: 'raciones', description: '🌶️ Picante' }),
  item({ name: 'Calamares rebozados', price: 12.5, category: 'raciones', popular: true }),
  item({ name: 'Cazón adobado', price: 10.5, category: 'raciones' }),
  item({ name: 'Sepia a la plancha', price: 13, category: 'raciones' }),
  item({ name: 'Lacón a feira', price: 9.5, category: 'raciones' }),
  item({ name: 'Jamón ibérico (ración)', price: 19, category: 'raciones' }),
  item({ name: 'Gambón a la plancha', price: 14.5, category: 'raciones' }),

  // Hamburguesas
  item({ name: 'Hamburguesa normal', price: 5.5, category: 'hamburguesas', description: burgerNote, ingredients: burgerIngredients }),
  item({ name: 'Hamburguesa especial', price: 6.5, category: 'hamburguesas', description: burgerNote, ingredients: burgerIngredients, popular: true, featured: true }),
  item({ name: 'Hamburguesa Lolillo', price: 7, category: 'hamburguesas', description: burgerNote, ingredients: burgerIngredients }),
  item({ name: 'Hamburguesa Zardaín', price: 7.5, category: 'hamburguesas', description: burgerNote, ingredients: burgerIngredients, popular: true, featured: true }),
  item({ name: 'Hamburguesa Chispa', price: 8, category: 'hamburguesas', description: burgerNote, ingredients: burgerIngredients }),
  item({ name: 'Hamburguesa Chispón', price: 9.5, category: 'hamburguesas', description: burgerNote, ingredients: burgerIngredients, popular: true, featured: true }),
  item({ name: 'Hamburguesa vegetariana', price: 8.5, category: 'hamburguesas', description: '🌱 Vegetariano', ingredients: burgerIngredients }),

  // Montados (porciones pequeñas)
  item({ name: 'Montado bacon especial', price: 4.5, category: 'montados' }),
  item({ name: 'Montado oreja con salsa brava', price: 4.5, category: 'montados' }),
  item({ name: 'Montado jamón ibérico', price: 5, category: 'montados' }),
  item({ name: 'Montado calamares con ali-oli', price: 5.5, category: 'montados', popular: true }),
  item({ name: 'Montado pollo, lechuga y mayonesa', price: 4, category: 'montados' }),
  item({ name: 'Montado de tortilla', price: 3.5, category: 'montados', popular: true }),
  item({ name: 'Montado de morcilla', price: 3.5, category: 'montados' }),
  item({ name: 'Montado picadillo de chorizo', price: 3.5, category: 'montados' }),
  item({ name: 'Montado de lomo', price: 4, category: 'montados', popular: true }),
  item({ name: 'Montado atún, tomate y mayonesa', price: 3.5, category: 'montados' }),

  // Bocadillos (completos)
  item({ name: 'Pepito de ternera', price: 6, category: 'bocadillos', popular: true }),
  item({ name: 'Bocadillo bacon especial', price: 6, category: 'bocadillos' }),
  item({ name: 'Bocadillo de oreja con salsa brava', price: 6, category: 'bocadillos' }),
  item({ name: 'Bocadillo de jamón ibérico', price: 6.5, category: 'bocadillos' }),
  item({ name: 'Bocadillo de calamares con ali-oli', price: 7, category: 'bocadillos', popular: true }),
  item({ name: 'Bocadillo pollo, lechuga y mayonesa', price: 5, category: 'bocadillos' }),
  item({ name: 'Bocadillo de tortilla', price: 4.5, category: 'bocadillos' }),
  item({ name: 'Bocadillo de morcilla', price: 4.5, category: 'bocadillos' }),
  item({ name: 'Bocadillo picadillo de chorizo', price: 4.5, category: 'bocadillos' }),
  item({ name: 'Bocadillo de lomo', price: 5, category: 'bocadillos', popular: true }),
  item({ name: 'Bocadillo atún, tomate y mayonesa', price: 4.5, category: 'bocadillos' }),
  item({ name: 'Serranito andaluz', price: 8, category: 'bocadillos', featured: true }),
  item({ name: 'Piripi sevillano', price: 6, category: 'bocadillos' }),
  item({ name: 'Campero malagueño', price: 6, category: 'bocadillos' }),

  // Tostas
  item({ name: 'Tosta jamón ibérico y salmorejo', price: 7, category: 'tostas' }),
  item({ name: 'Tosta salmón, ali-oli y tomate', price: 7, category: 'tostas' }),
  item({ name: 'Tosta salmón, philadelphia y pepinillos', price: 7, category: 'tostas' }),
  item({ name: 'Tosta gulas, gambas y ali-oli', price: 7, category: 'tostas' }),
  item({ name: 'Tosta mousse, queso de cabra y cebolla caramelizada', price: 7, category: 'tostas' }),
  item({ name: 'Tosta espárragos, queso y jamón ibérico', price: 7, category: 'tostas' }),
  item({ name: 'Tosta solomillo y Torta del Casar', price: 7, category: 'tostas', featured: true }),

  // Sándwiches
  item({ name: 'Sándwich mixto', price: 3.5, category: 'sandwiches', popular: true }),
  item({ name: 'Sándwich mixto con huevo', price: 4.5, category: 'sandwiches' }),
  item({ name: 'Sándwich Zardaín de pollo', price: 7, category: 'sandwiches', popular: true, featured: true }),
  item({ name: 'Sándwich Zardaín de salmón', price: 8, category: 'sandwiches', featured: true }),
  item({ name: 'Sándwich vegetal', price: 6, category: 'sandwiches', description: '🌱 Vegetariano' }),

  // Ensaladas
  item({ name: 'Ensalada mixta', price: 8, category: 'ensaladas' }),
  item({ name: 'Ensalada rulo de cabra y bacon', price: 10, category: 'ensaladas' }),
  item({ name: 'Ensalada ventresca con pimientos', price: 10, category: 'ensaladas' }),
  item({ name: 'Ensalada manzana y nueces', price: 10, category: 'ensaladas', description: '🌱 Vegetariano' }),
  item({ name: 'Tomate aliñado', price: 7, category: 'ensaladas', description: '🌱 Vegetariano' }),

  // Bebidas
  item({ name: 'Agua', price: 1.5, category: 'bebidas', image: '💧' }),
  item({ name: 'Refrescos', price: 2.5, category: 'bebidas', image: '🥤', popular: true }),
  item({ name: 'Cerveza doble', price: 2.7, category: 'bebidas', image: '🍺', popular: true }),
  item({ name: 'Tercio', price: 2.7, category: 'bebidas', image: '🍺' }),
  item({ name: 'Vino tinto', price: 2.5, category: 'bebidas', image: '🍷' }),
  item({ name: 'Vino blanco', price: 2.5, category: 'bebidas', image: '🍷' }),
  item({ name: 'Café', price: 1.5, category: 'bebidas', image: '☕' }),
  item({ name: 'Zumo natural', price: 3, category: 'bebidas', image: '🧃' }),
];

export const MENU_VERSION = 'zardain-2026-no-combinados';

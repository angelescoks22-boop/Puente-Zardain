import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import * as usersRepo from '../db/users.js';
import * as productsRepo from '../db/products.js';
import * as rewardsRepo from '../db/rewards.js';
import * as settingsRepo from '../db/settings.js';
import * as businessMessagesRepo from '../db/businessMessages.js';
import * as reviewsRepo from '../db/reviews.js';
import { seedProducts, MENU_VERSION } from '../data/products.js';

export async function seedDatabase() {
  const adminExists = await usersRepo.existsByRole('admin');
  if (!adminExists) {
    await usersRepo.create({
      name: 'Administrador',
      phone: '000000000',
      email: env.adminEmail,
      password: await bcrypt.hash(env.adminPassword, 10),
      passwordUserSet: true,
      role: 'admin',
      phoneVerified: true,
      zardas: 0,
    });
    console.log(`👤 Admin creado: ${env.adminEmail} / ${env.adminPassword}`);
  }

  const legacyMenu = await productsRepo.existsByName('Zardain Classic');
  let settingsDoc = await settingsRepo.getSingleton();
  const needsMenuSync =
    legacyMenu ||
    process.env.RESEED_MENU === 'true' ||
    settingsDoc?.menuVersion !== MENU_VERSION;

  if (needsMenuSync) {
    await productsRepo.deleteAll();
    await productsRepo.insertMany(seedProducts);
    settingsDoc = await settingsRepo.upsertMenuVersion(MENU_VERSION);
    console.log(`🍔 Carta Puente Zardaín actualizada: ${seedProducts.length} productos`);
  } else {
    const { deactivateDeprecatedProducts } = await import('../services/products.service.js');
    await deactivateDeprecatedProducts();
    const productCount = await productsRepo.countDocuments();
    if (productCount === 0) {
      await productsRepo.insertMany(seedProducts);
      settingsDoc = await settingsRepo.upsertMenuVersion(MENU_VERSION);
      console.log(`🍔 ${seedProducts.length} productos insertados`);
    }
  }

  const rewardCount = await rewardsRepo.countDocuments();
  if (rewardCount === 0) {
    await rewardsRepo.insertMany([
      { name: 'Bebida gratis', description: 'Cualquier bebida del menú', zardasCost: 50, icon: '🥤', active: true },
      { name: 'Patatas CheeseBacon', description: 'Ración de patatas', zardasCost: 80, icon: '🍟', active: true },
      { name: 'Sándwich mixto', description: 'Tu sándwich favorito', zardasCost: 120, icon: '🥪', active: true },
    ]);
  }

  if (!settingsDoc) {
    await settingsRepo.create({ menuVersion: MENU_VERSION });
  }

  const msgCount = await businessMessagesRepo.countDocuments();
  if (msgCount === 0) {
    await businessMessagesRepo.insertMany([
      { text: '🔥 Mucho movimiento hoy — pedidos pueden tardar un poco más', type: 'warning', active: true },
      { text: '🎉 Recomendadas: Chispón, Zardaín y Especial', type: 'promo', active: true },
    ]);
  }

  const reviewCount = await reviewsRepo.countDocuments();
  if (reviewCount === 0) {
    const products = await productsRepo.find({}, 'created_at ASC');
    const adminUser = await usersRepo.findOneByRole('admin');
    const samples = [
      { userName: 'María G.', rating: 5, comment: 'Las mejores hamburguesas de Arroyomolinos. Repetiré seguro.' },
      { userName: 'Carlos R.', rating: 4, comment: 'Muy rápido y buen trato. El Puente Zardain es una pasada.' },
      { userName: 'Laura M.', rating: 5, comment: 'Pedido online genial, sin llamadas. 10/10.' },
    ];
    for (let i = 0; i < samples.length; i++) {
      if (!adminUser) break;
      await reviewsRepo.create({
        userId: adminUser.id,
        userName: samples[i].userName,
        productId: products[i % products.length]?.id,
        rating: samples[i].rating,
        comment: samples[i].comment,
        approved: true,
        verified: true,
      });
    }
    console.log(`⭐ ${samples.length} reseñas de ejemplo insertadas`);
  }
}

const __filename = fileURLToPath(import.meta.url);

function isSeedCliEntry() {
  return process.argv.some((arg) => {
    try {
      return path.resolve(arg) === __filename;
    } catch {
      return false;
    }
  });
}

async function main() {
  await connectDB();
  await seedDatabase();
  console.log('✅ Seed completado');
  process.exit(0);
}

if (isSeedCliEntry()) {
  main().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

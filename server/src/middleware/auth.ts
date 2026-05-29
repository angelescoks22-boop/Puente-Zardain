import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { Request, Response, NextFunction } from 'express';

import { env } from '../config/env.js';

import type { IUser } from '../models/User.js';

import * as usersRepo from '../db/users.js';

import * as revokedTokensRepo from '../db/revokedTokens.js';



export interface AuthRequest extends Request {

  user?: IUser;

  userId?: string;

}



export function hashToken(token: string): string {

  return crypto.createHash('sha256').update(token).digest('hex');

}



export function signToken(user: IUser, rememberMe = true) {

  const expiresIn = rememberMe ? '30d' : '8h';

  return jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn });

}



export async function revokeToken(token: string): Promise<void> {

  const decoded = jwt.decode(token) as { exp?: number } | null;

  if (!decoded) return;

  const expiresAt = decoded.exp

    ? new Date(decoded.exp * 1000)

    : new Date(Date.now() + 8 * 60 * 60 * 1000);

  await revokedTokensRepo.insertRevokedToken(hashToken(token), expiresAt);

}



export async function isTokenRevoked(token: string): Promise<boolean> {

  return revokedTokensRepo.isTokenRevoked(hashToken(token));

}



export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {

  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {

    return res.status(401).json({ message: 'No autorizado' });

  }

  const token = header.slice(7);

  try {

    if (await isTokenRevoked(token)) {

      return res.status(401).json({ message: 'Token revocado' });

    }

    const decoded = jwt.verify(token, env.jwtSecret) as { id: string; role: string };

    const user = await usersRepo.findById(decoded.id);

    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });

    req.user = user;

    req.userId = user.id;

    next();

  } catch {

    return res.status(401).json({ message: 'Token inválido' });

  }

}



export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {

  if (req.user?.role !== 'admin') {

    return res.status(403).json({ message: 'Acceso denegado' });

  }

  next();

}



export function formatUser(user: IUser) {

  return {

    id: user.id,

    name: user.name,

    phone: user.phone,

    email: user.email,

    role: user.role,

    address: user.address,

    addresses: (user.addresses ?? []).map((a) => ({

      id: a.id ?? '',

      fullAddress: a.fullAddress,

      city: a.city,

      lat: a.lat,

      lng: a.lng,

      placeId: a.placeId,

      label: a.label,

      portal: a.portal,

      floor: a.floor,

      door: a.door,

      details: a.details,

      isDefault: a.isDefault,

    })),

    zardas: user.zardas,

    level: user.level,

    levelProgress: user.levelProgress,

    orderCount: user.orderCount,

    streak: user.streak,

    lastOrderDate: user.lastOrderDate?.toISOString(),

    isBlocked: user.isBlocked,

    noShowCount: user.noShowCount,

    phoneVerified: user.phoneVerified,

    clientStatus: user.clientStatus,

    favoriteProductId: user.favoriteProductId,

    profileAvatar: user.profileAvatar ?? '😊',

    profileColor: user.profileColor ?? '#e85d04',

    profileTagline: user.profileTagline ?? '',

    profileFrame: user.profileFrame ?? 'none',

    birthday: user.birthday ? formatBirthday(user.birthday) : undefined,

    birthdayRewardClaimedYear: user.birthdayRewardClaimedYear,

    birthdayFreeProductPending: user.birthdayFreeProductPending ?? false,

    createdAt: user.createdAt.toISOString(),

  };

}



function formatBirthday(birthday: Date) {

  const y = birthday.getFullYear();

  const m = String(birthday.getMonth() + 1).padStart(2, '0');

  const d = String(birthday.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;

}



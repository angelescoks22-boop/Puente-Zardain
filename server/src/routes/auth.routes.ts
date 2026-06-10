import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { IUser } from '../models/User.js';
import * as usersRepo from '../db/users.js';
import * as pendingOtpsRepo from '../db/pendingOtps.js';
import { authenticate, signToken, formatUser, AuthRequest, revokeToken } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  sendCodeSchema,
  verifyCodeSchema,
  verifyOtpCompatSchema,
  registerSchema,
  loginSchema,
  resendOtpSchema,
  changePasswordSchema,
} from '../schemas/auth.schema.js';
import { ZARDAS_REGISTER, ZARDAS_BIRTHDAY, BIRTHDAY_FREE_PRODUCT } from '../utils/gamification.js';
import { validateAddressServer, fetchAddressSuggestions } from '../services/geocode.service.js';
import { queueOtpEmail, isEmailConfigured } from '../services/email.service.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import type { AddressPayload } from '../utils/addressValidation.js';

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  keyPrefix: 'auth',
  message: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.',
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: 'login',
  message: 'Demasiados intentos de acceso. Espera 15 minutos.',
});

const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyPrefix: 'otp',
  message: 'Demasiados códigos solicitados. Espera antes de reintentar.',
});

const passwordChangeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'pwd',
  message: 'Demasiados intentos de cambio de contraseña. Espera 15 minutos.',
});

function userProvidedPassword(password: unknown): boolean {
  return typeof password === 'string' && password.trim().length >= 6;
}

const router = Router();
router.use(authLimiter);

function syncLegacyAddress(user: IUser) {
  const def = user.addresses?.find((a) => a.isDefault) ?? user.addresses?.[0];
  user.address = def?.fullAddress ?? user.address;
}

function isBirthdayToday(birthday?: Date | null, now = new Date()) {
  if (!birthday) return false;
  return birthday.getMonth() === now.getMonth() && birthday.getDate() === now.getDate();
}

const OTP_TTL_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function dispatchOtpEmail(email: string, otp: string) {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[EMAIL dev] To: ${email} | Código: ${otp}`);
    } else {
      console.error('[EMAIL] SMTP no configurado en producción — OTP no enviado a', email);
    }
    return;
  }
  queueOtpEmail(email, otp);
}

async function createAndSendOtp(
  email: string,
  extra?: Omit<Parameters<typeof pendingOtpsRepo.upsertByEmail>[0], 'email' | 'otp' | 'expiresAt' | 'attempts'>,
) {
  const otp = generateOtp();
  await pendingOtpsRepo.upsertByEmail({
    email,
    otp,
    attempts: 0,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    ...extra,
  });
  dispatchOtpEmail(email, otp);
  return otp;
}

async function verifyOtpRecord(email: string, code: string) {
  const pending = await pendingOtpsRepo.findByEmail(email);
  if (!pending) return { ok: false as const, message: 'No hay verificación pendiente. Solicita un nuevo código.' };
  if (pending.attempts >= MAX_OTP_ATTEMPTS) {
    return { ok: false as const, message: 'Demasiados intentos. Solicita un nuevo código.' };
  }
  if (new Date() > pending.expiresAt) {
    return { ok: false as const, message: 'Código expirado. Solicita uno nuevo.' };
  }
  if (pending.otp !== code) {
    await pendingOtpsRepo.updateAttempts(email, pending.attempts + 1);
    return { ok: false as const, message: 'Código incorrecto' };
  }
  return { ok: true as const, pending };
}

function placeholderPhoneFromEmail(email: string) {
  const hash = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `9${String(hash).padStart(8, '0').slice(-8)}`;
}

router.post('/validate-address', async (req, res) => {
  const result = await validateAddressServer(req.body as Partial<AddressPayload>);
  if (!result.valid) {
    return res.status(400).json({ valid: false, message: result.message });
  }
  res.json({ valid: true, message: result.message, address: result.address });
});

router.get('/address-suggestions', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 3) return res.json([]);
  const suggestions = await fetchAddressSuggestions(q);
  res.json(suggestions);
});

router.post('/send-code', otpLimiter, validateBody(sendCodeSchema), async (req, res) => {
  const email = normalizeEmail(String(req.body.email ?? ''));
  const user = await usersRepo.findOneByEmail(email);
  if (!user) {
    return res.status(404).json({
      message: 'No hay cuenta con este email. Regístrate primero.',
      code: 'NO_ACCOUNT',
    });
  }
  if (user?.isBlocked || user?.clientStatus === 'blocked') {
    return res.status(403).json({ message: 'Cuenta bloqueada' });
  }
  if (user?.role === 'admin') {
    return res.status(400).json({
      message: 'Cuenta de administrador: entra con email y contraseña (no uses código OTP).',
      code: 'ADMIN_USE_PASSWORD',
    });
  }

  await createAndSendOtp(email);
  res.json({ ok: true, email, emailSent: isEmailConfigured() });
});

async function completeEmailVerification(
  email: string,
  code: string,
  rememberMe: boolean,
  res: import('express').Response,
) {
  if (!isValidEmail(email) || code.length !== 6) {
    return res.status(400).json({ message: 'Email o código inválido' });
  }

  const check = await verifyOtpRecord(email, code);
  if (!check.ok) return res.status(400).json({ message: check.message });

  const { pending } = check;
  let user = await usersRepo.findOneByEmail(email);

  if (!user && pending.passwordHash && pending.name) {
    const pendingAddr = pending.pendingAddress;
    const userData: usersRepo.CreateUserInput = {
      name: pending.name,
      phone: pending.phone ?? placeholderPhoneFromEmail(email),
      email,
      password: pending.passwordHash,
      passwordUserSet: pending.passwordUserSet ?? false,
      role: 'client',
      zardas: ZARDAS_REGISTER,
      phoneVerified: true,
    };
    if (pendingAddr) {
      userData.address = pendingAddr.fullAddress;
      userData.addresses = [{ ...pendingAddr, id: crypto.randomUUID(), isDefault: true, label: 'Casa' }];
    }
    try {
      user = await usersRepo.create(userData);
    } catch (err) {
      const pgCode = (err as { code?: string }).code;
      if (pgCode === '23505') {
        user = await usersRepo.findOneByEmail(email);
        if (!user) throw err;
      } else {
        throw err;
      }
    }
  } else if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    user = await usersRepo.create({
      name: pending.name?.trim() || email.split('@')[0] || 'Cliente',
      phone: pending.phone ?? placeholderPhoneFromEmail(email),
      email,
      password: passwordHash,
      role: 'client',
      zardas: ZARDAS_REGISTER,
      phoneVerified: true,
    });
    if (pending.pendingAddress) {
      user.addresses = [{ ...pending.pendingAddress, id: crypto.randomUUID(), isDefault: true, label: 'Casa' }];
      user.address = pending.pendingAddress.fullAddress;
      user = await usersRepo.save(user);
    }
  } else if (user.isBlocked || user.clientStatus === 'blocked') {
    return res.status(403).json({ message: 'Cuenta bloqueada' });
  } else {
    let dirty = false;
    if (!user.phoneVerified) {
      user.phoneVerified = true;
      dirty = true;
    }
    const placeholderPhone = placeholderPhoneFromEmail(email);
    if (pending.name?.trim() && (user.name === 'Cliente' || user.name === email.split('@')[0])) {
      user.name = pending.name.trim();
      dirty = true;
    }
    if (pending.phone && user.phone === placeholderPhone) {
      user.phone = pending.phone;
      dirty = true;
    }
    if (pending.pendingAddress && !user.addresses?.length) {
      user.addresses = [{ ...pending.pendingAddress, id: crypto.randomUUID(), isDefault: true, label: 'Casa' }];
      user.address = pending.pendingAddress.fullAddress;
      dirty = true;
    }
    if (dirty) {
      user = await usersRepo.save(user);
    }
  }

  await pendingOtpsRepo.deleteByEmail(email);
  const fresh = await usersRepo.findById(user.id);
  if (!fresh) {
    return res.status(500).json({ message: 'Error al cargar el usuario' });
  }
  const token = signToken(fresh, rememberMe);
  res.json({ user: formatUser(fresh), token, role: fresh.role, rememberMe });
}

router.post('/verify-code', otpLimiter, validateBody(verifyCodeSchema), async (req, res) => {
  const email = normalizeEmail(String(req.body.email ?? ''));
  const code = String(req.body.code ?? '').replace(/\D/g, '').slice(0, 6);
  const rememberMe = req.body.rememberMe !== false;
  await completeEmailVerification(email, code, rememberMe !== false, res);
});

router.post('/verify-otp', otpLimiter, validateBody(verifyOtpCompatSchema), async (req, res) => {
  const email = normalizeEmail(String(req.body.email ?? req.body.phone ?? ''));
  const code = String(req.body.code ?? '').trim();
  const rememberMe = req.body.rememberMe !== false;
  await completeEmailVerification(email, code, rememberMe !== false, res);
});

router.post('/register', otpLimiter, validateBody(registerSchema), async (req, res) => {
  const { name, phone, email, password, address } = req.body;
  const addressCheck = await validateAddressServer(address as Partial<AddressPayload>);
  if (!addressCheck.valid || !addressCheck.address) {
    return res.status(400).json({
      message: addressCheck.message || 'Selecciona una dirección válida en Arroyomolinos',
    });
  }

  const normalizedEmail = normalizeEmail(email);
  const exists = await usersRepo.findOneByPhoneOrEmail(phone, email);

  if (exists) {
    if (exists.email.toLowerCase() === normalizedEmail) {
      if (exists.role === 'admin') {
        return res.status(400).json({
          message: 'Cuenta de administrador: usa Entrar con email y contraseña.',
          code: 'ADMIN_USE_PASSWORD',
        });
      }
      const passwordHash = await bcrypt.hash(password || crypto.randomUUID(), 10);
      await createAndSendOtp(normalizedEmail, {
        phone,
        name: name.trim(),
        passwordHash,
        passwordUserSet: userProvidedPassword(password),
        pendingAddress: addressCheck.address,
      });
      return res.json({
        needsOtp: true,
        email: normalizedEmail,
        existingAccount: true,
        message: 'Ya tienes cuenta. Te hemos enviado un código para entrar.',
        emailSent: isEmailConfigured(),
      });
    }
    return res.status(409).json({ message: 'Este teléfono ya está registrado con otro email' });
  }

  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(password || crypto.randomUUID(), 10);

  await pendingOtpsRepo.upsertByEmail({
    email: normalizedEmail,
    phone,
    name: name.trim(),
    passwordHash,
    passwordUserSet: userProvidedPassword(password),
    otp,
    attempts: 0,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    pendingAddress: addressCheck.address,
  });

  dispatchOtpEmail(normalizedEmail, otp);
  res.json({
    needsOtp: true,
    email: normalizedEmail,
    emailSent: isEmailConfigured(),
    message: isEmailConfigured()
      ? 'Te enviamos un código a tu correo. Revisa también spam.'
      : 'El correo no está configurado en el servidor. Contacta con el local.',
  });
});

router.post('/resend-otp', otpLimiter, validateBody(resendOtpSchema), async (req, res) => {
  const email = normalizeEmail(String(req.body.email ?? req.body.phone ?? ''));
  const pending = await pendingOtpsRepo.findByEmail(email);

  if (!pending) {
    return res.status(404).json({
      message: 'No hay registro pendiente. Vuelve a crear la cuenta.',
      code: 'NO_PENDING',
    });
  }

  await createAndSendOtp(email, {
    phone: pending.phone,
    name: pending.name,
    passwordHash: pending.passwordHash,
    pendingAddress: pending.pendingAddress,
  });
  res.json({ ok: true, emailSent: isEmailConfigured() });
});

router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { password, rememberMe = false } = req.body;
  const identifier = String(req.body.identifier ?? '').trim().toLowerCase();
  let user = await usersRepo.findOneByIdentifier(identifier);

  if (!user && isValidEmail(identifier)) {
    const pending = await pendingOtpsRepo.findByEmail(identifier);
    if (pending && new Date() <= pending.expiresAt) {
      dispatchOtpEmail(identifier, pending.otp);
      return res.status(403).json({
        message: 'Tu cuenta aún no está activa. Confirma el código que te enviamos por email.',
        code: 'EMAIL_NOT_VERIFIED',
        email: identifier,
      });
    }
  }

  if (!user) return res.status(401).json({ message: 'Credenciales incorrectas' });
  if (user.isBlocked || user.clientStatus === 'blocked') {
    return res.status(403).json({ message: 'Cuenta bloqueada' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Credenciales incorrectas' });

  if (!user.passwordUserSet) {
    await usersRepo.markPasswordUserSet(user.id);
    user.passwordUserSet = true;
  }

  if (user.role === 'client' && !user.phoneVerified) {
    await createAndSendOtp(normalizeEmail(user.email));
    return res.status(403).json({
      message: 'Verifica tu email con el código que te acabamos de enviar.',
      code: 'EMAIL_NOT_VERIFIED',
      email: normalizeEmail(user.email),
    });
  }

  const token = signToken(user, Boolean(rememberMe));
  res.json({ user: formatUser(user), token, role: user.role, rememberMe: Boolean(rememberMe) });
});

router.post('/logout', async (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    await revokeToken(header.slice(7));
  }
  res.json({ ok: true });
});

router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json(formatUser(req.user!));
});

router.patch('/me', authenticate, async (req: AuthRequest, res) => {
  const { name, phone, address, birthday, profileAvatar, profileColor, profileTagline, profileFrame } = req.body;
  const user = req.user!;
  if (name) {
    const trimmed = String(name).trim().slice(0, 80);
    if (trimmed.length < 2) {
      return res.status(400).json({ message: 'Nombre demasiado corto' });
    }
    user.name = trimmed;
  }
  if (phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length < 9) {
      return res.status(400).json({ message: 'Teléfono no válido (mínimo 9 dígitos)' });
    }
    const existing = await usersRepo.findOneByIdentifier(digits);
    if (existing && existing.id !== user.id) {
      return res.status(409).json({ message: 'Ese teléfono ya está registrado' });
    }
    user.phone = digits;
  }
  if (address !== undefined) user.address = address;
  if (profileAvatar !== undefined) user.profileAvatar = profileAvatar;
  if (profileColor !== undefined) user.profileColor = profileColor;
  if (profileTagline !== undefined) {
    user.profileTagline = String(profileTagline).slice(0, 60).trim();
  }
  if (profileFrame !== undefined) {
    const allowed = ['none', 'gold', 'fire', 'zardas', 'diamond'];
    user.profileFrame = allowed.includes(profileFrame) ? profileFrame : 'none';
  }
  if (birthday !== undefined) {
    if (!birthday) {
      user.birthday = undefined;
    } else {
      const parsed = new Date(birthday);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Fecha de cumpleaños no válida' });
      }
      user.birthday = parsed;
    }
  }
  await usersRepo.save(user);
  res.json(formatUser(user));
});

router.post('/me/password', authenticate, passwordChangeLimiter, validateBody(changePasswordSchema), async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword: string;
  };
  const user = req.user!;

  if (user.passwordUserSet) {
    if (!currentPassword) {
      return res.status(400).json({
        message: 'Introduce tu contraseña actual',
        code: 'CURRENT_PASSWORD_REQUIRED',
      });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Contraseña actual incorrecta', code: 'WRONG_PASSWORD' });
    }
  } else if (currentPassword) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Contraseña actual incorrecta', code: 'WRONG_PASSWORD' });
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await usersRepo.updatePassword(user.id, passwordHash, true);
  if (!updated) {
    return res.status(500).json({ message: 'No se pudo actualizar la contraseña' });
  }

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    await revokeToken(header.slice(7));
  }

  const token = signToken(updated, true);
  res.json({
    user: formatUser(updated),
    token,
    message: user.passwordUserSet ? 'Contraseña actualizada' : 'Contraseña creada correctamente',
  });
});

router.get('/birthday-status', authenticate, (req: AuthRequest, res) => {
  const user = req.user!;
  const year = new Date().getFullYear();
  const isBirthday = isBirthdayToday(user.birthday);
  const claimed = user.birthdayRewardClaimedYear === year;
  res.json({
    isBirthday,
    claimed,
    hasBirthday: !!user.birthday,
    zardasReward: ZARDAS_BIRTHDAY,
    freeProduct: BIRTHDAY_FREE_PRODUCT,
    freeProductPending: user.birthdayFreeProductPending ?? false,
  });
});

router.post('/claim-birthday', authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const year = new Date().getFullYear();

  if (!user.birthday) {
    return res.status(400).json({ message: 'Añade tu cumpleaños en el perfil' });
  }
  if (!isBirthdayToday(user.birthday)) {
    return res.status(400).json({ message: 'Hoy no es tu cumpleaños' });
  }
  const updated = await usersRepo.claimBirthdayRewardAtomic(user.id, year, ZARDAS_BIRTHDAY);
  if (!updated) {
    return res.status(409).json({ message: 'Ya reclamaste la recompensa este año' });
  }

  res.json({
    user: formatUser(updated),
    zardasAwarded: ZARDAS_BIRTHDAY,
    freeProduct: BIRTHDAY_FREE_PRODUCT,
  });
});

router.post('/me/addresses', authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const { address, label, setDefault } = req.body as {
    address: Partial<AddressPayload>;
    label?: string;
    setDefault?: boolean;
  };

  const check = await validateAddressServer(address);
  if (!check.valid || !check.address) {
    return res.status(400).json({ message: check.message });
  }

  const isFirst = !user.addresses?.length;
  const makeDefault = setDefault ?? isFirst;

  if (makeDefault) {
    user.addresses?.forEach((a) => { a.isDefault = false; });
  }

  if (!user.addresses) user.addresses = [];

  user.addresses.push({
    ...check.address,
    id: crypto.randomUUID(),
    label: label?.trim() || (isFirst ? 'Casa' : 'Otra'),
    isDefault: makeDefault,
  });

  syncLegacyAddress(user);
  await usersRepo.save(user);
  res.json(formatUser(user));
});

router.patch('/me/addresses/:addressId/default', authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const { addressId } = req.params;
  const target = user.addresses?.find((a) => a.id === addressId);
  if (!target) return res.status(404).json({ message: 'Dirección no encontrada' });

  user.addresses.forEach((a) => { a.isDefault = a.id === addressId; });
  syncLegacyAddress(user);
  await usersRepo.save(user);
  res.json(formatUser(user));
});

router.delete('/me/addresses/:addressId', authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const { addressId } = req.params;
  const idx = user.addresses?.findIndex((a) => a.id === addressId) ?? -1;
  if (idx < 0) return res.status(404).json({ message: 'Dirección no encontrada' });

  const wasDefault = user.addresses[idx].isDefault;
  user.addresses.splice(idx, 1);

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  syncLegacyAddress(user);
  await usersRepo.save(user);
  res.json(formatUser(user));
});

export default router;

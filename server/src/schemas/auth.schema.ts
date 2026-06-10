import { z } from 'zod';

const optionalText = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z.string().optional(),
);

const addressSchema = z.object({
  fullAddress: z.string().min(5, 'Selecciona una dirección válida'),
  city: optionalText,
  lat: z.number(),
  lng: z.number(),
  placeId: optionalText,
  label: optionalText,
  portal: optionalText,
  floor: optionalText,
  door: optionalText,
  details: optionalText,
});

export const sendCodeSchema = z.object({
  email: z.string().email('Introduce un email válido'),
});

export const verifyCodeSchema = z.object({
  email: z.string().email('Introduce un email válido'),
  code: z.preprocess(
    (val) => String(val ?? '').replace(/\D/g, '').slice(0, 6),
    z.string().length(6, 'El código debe tener 6 dígitos'),
  ),
  rememberMe: z.boolean().optional(),
});

/** Compat legacy: acepta email o phone en verify-otp */
export const verifyOtpCompatSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
  rememberMe: z.boolean().optional(),
}).refine((d) => d.email || d.phone, { message: 'Email requerido' });

export const registerSchema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto').max(100),
  email: z.string().email('Email inválido'),
  phone: z.string().min(9, 'Teléfono inválido').max(20),
  password: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().min(6, 'Contraseña mínimo 6 caracteres').optional(),
  ),
  address: addressSchema,
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Identificador inválido'),
  password: z.string().min(1, 'Introduce la contraseña'),
  rememberMe: z.boolean().optional(),
});

export const resendOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine((d) => d.email || d.phone, { message: 'Email requerido' });

export const changePasswordSchema = z.object({
  currentPassword: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().min(1).optional(),
  ),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres').max(128),
  confirmPassword: z.string().min(6).max(128),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

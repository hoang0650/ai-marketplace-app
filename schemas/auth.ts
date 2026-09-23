import { z } from 'zod';

/** Match web register. Login must not block existing short-password accounts. */
export const MIN_PASSWORD_LENGTH = 6;
/** API register requires 8+ characters. */
export const MIN_REGISTER_PASSWORD_LENGTH = 8;

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(MIN_PASSWORD_LENGTH, 'Mật khẩu tối thiểu 6 ký tự'),
});

export const SIGNUP_ROLES = ['buyer', 'seller', 'talent', 'freelancer', 'employer'] as const;
export type SignupRoleValue = (typeof SIGNUP_ROLES)[number];

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Họ tên bắt buộc').max(120),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(MIN_REGISTER_PASSWORD_LENGTH, 'Mật khẩu tối thiểu 8 ký tự').max(128),
    confirmPassword: z.string(),
    role: z.enum(SIGNUP_ROLES),
    agreeTerms: z.boolean(),
    agreePrivacy: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu không khớp' })
  .refine((d) => d.agreeTerms && d.agreePrivacy, { path: ['agreeTerms'], message: 'Cần đồng ý điều khoản bắt buộc' });

export const complaintSchema = z.object({
  kind: z.enum([
    'buyer_seller',
    'buyer_platform',
    'seller_platform',
    'employer_freelancer',
    'freelancer_employer',
    'employer_platform',
    'freelancer_platform',
  ]),
  body: z.string().min(8, 'Mô tả tối thiểu 8 ký tự').max(4000),
  orderId: z.string().optional(),
  evidence: z.string().optional(),
});

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
});

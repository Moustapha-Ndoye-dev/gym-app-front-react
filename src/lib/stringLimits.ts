/**
 * Limites de longueur — alignées sur `gym back/src/validation/stringLimits.ts`.
 */
export const STRING_LIMITS = {
  personName: { min: 2, max: 80 },
  labelName: { min: 2, max: 120 },
  description: { max: 2000 },
  phone: { min: 8, max: 32 },
  memberPhone: { max: 32 },
  username: { min: 3, max: 64 },
  password: { min: 5, max: 128 },
  gymName: { min: 2, max: 120 },
  productCategory: { max: 80 },
  email: { max: 254 },
} as const;

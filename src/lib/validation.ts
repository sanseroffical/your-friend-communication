import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().trim().email().max(255),
  username: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_]+$/),
  password: z.string().min(8).max(128),
});

export const messageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  authorId: z.string().uuid(),
  roomId: z.string().uuid(),
});

export const validateInput = <T>(data: unknown, schema: z.ZodType<T>) => {
  const result = schema.safeParse(data);
  return result.success
    ? { valid: true as const, data: result.data, errors: null }
    : { valid: false as const, data: null, errors: result.error.flatten() };
};
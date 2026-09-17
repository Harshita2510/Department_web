import { z } from 'zod';

export const loginSchema = z.object({ body: z.object({ identifier: z.string().trim().min(3), password: z.string().min(8).max(128) }) });
export const createFacultySchema = z.object({ body: z.object({ facultyId: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/), temporaryPassword: z.string().min(8).max(128) }) });
export const changePasswordSchema = z.object({ body: z.object({ currentPassword: z.string().min(8).max(128), newPassword: z.string().min(10).max(128) }) });
export const resetFacultyPasswordSchema=z.object({
  params:z.object({facultyId:z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/)}),
  body:z.object({temporaryPassword:z.string().min(10).max(128)})
});

import { z } from 'zod';

export const loginSchema = z.object({ body: z.object({ identifier: z.string().trim().min(3), password: z.string().min(8).max(128) }) });
const experience = z.union([z.number(), z.string().trim().min(1).transform(Number)])
  .pipe(z.number().finite().min(0, 'Experience must be zero or greater'));
export const createFacultySchema = z.object({ body: z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(120),
  designation: z.string().trim().min(1, 'Designation is required').max(120),
  facultyId: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/, 'Employee number must be 3–30 letters, numbers or hyphens'),
  experienceYears: experience,
  highestQualification: z.string().trim().min(1, 'Highest qualification is required').max(300),
  areaOfSpecialisation: z.string().trim().min(1, 'Area of specialisation is required').max(500),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z.string().trim().max(30).optional(),
  temporaryPassword: z.string().min(8).max(128)
}).strict() });
export const changePasswordSchema = z.object({ body: z.object({ currentPassword: z.string().min(8).max(128), newPassword: z.string().min(10).max(128) }) });
export const resetFacultyPasswordSchema=z.object({
  params:z.object({facultyId:z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/)}),
  body:z.object({temporaryPassword:z.string().min(10).max(128)})
});
export const facultyNoticePermissionSchema=z.object({
  params:z.object({facultyId:z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/)}),
  body:z.object({allowed:z.boolean()})
});

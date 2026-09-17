import { z } from 'zod';

const optionalHttpsUrl = z.union([z.literal(''), z.url().refine((value) => new URL(value).protocol === 'https:')]).optional();
export const facultyDraftSchema = z.object({ body: z.object({
  title: z.string().max(20).optional(), fullName: z.string().max(120).optional(), designation: z.string().max(120).optional(),
  department: z.string().max(150).optional(), email: z.union([z.literal(''), z.email()]).optional(), phone: z.string().max(30).optional(),
  office: z.string().max(150).optional(), officeHours: z.string().max(150).optional(), bio: z.string().max(5000).optional(),
  scholarUrl: optionalHttpsUrl, orcidUrl: optionalHttpsUrl, linkedinUrl: optionalHttpsUrl, websiteUrl: optionalHttpsUrl,
  qualifications: z.array(z.string().max(300)).max(30).optional(), researchInterests: z.array(z.string().max(120)).max(50).optional(),
  coursesTaught: z.array(z.string().max(120)).max(50).optional(), experienceYears: z.number().int().min(0).max(80).optional(),
  scholarsSupervised: z.number().int().min(0).max(999).optional(), researchSummary: z.string().max(5000).optional(),
  publications: z.array(z.object({ title:z.string().max(500), year:z.number().int().min(1900).max(2200).optional(), type:z.string().max(80).optional(), venue:z.string().max(300).optional(), url:optionalHttpsUrl })).max(200).optional(),
  achievements: z.array(z.object({ title:z.string().max(500), year:z.number().int().min(1900).max(2200).optional(), category:z.string().max(80).optional(), description:z.string().max(1000).optional() })).max(200).optional()
}).strict() });
export const facultyIdSchema = z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) });

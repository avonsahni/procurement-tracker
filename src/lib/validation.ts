import { NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';

const trimmedString = (label: string, min = 1, max = 200) =>
  z.string().trim().min(min, `${label} required`).max(max, `${label} too long`);

const nonNegNumber = (label: string) =>
  z.number({ message: `${label} must be a number` }).min(0, `${label} must be non-negative`);

export const STAGES = [
  'Spec Received',
  'RFQ Float',
  'Technical Negotiation',
  'Commercial Negotiation',
  'Award',
] as const;

const stage = z.enum(STAGES);
const origin = z.enum(['Domestic', 'Import']);
const currency = z.enum(['INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD']);
const role = z.enum(['admin', 'user', 'viewer']);

export const LoginSchema = z.object({
  email: z.string().trim().email('valid email required'),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

export const SignupSchema = z.object({
  email:        z.string().trim().email('valid email required'),
  password:     z.string().min(8, 'password must be at least 8 characters'),
  fullName:     trimmedString('fullName', 1, 200),
  jobTitle:     z.string().trim().max(200).optional().default(''),
  orgName:      z.string().trim().max(200).optional().default('My Organisation'),
  orgType:      z.string().trim().max(100).optional().default(''),
  website:      z.string().trim().max(300).optional().default(''),
  addressLine1: z.string().trim().max(300).optional().default(''),
  city:         z.string().trim().max(100).optional().default(''),
  stateRegion:  z.string().trim().max(100).optional().default(''),
  country:      z.string().trim().max(100).optional().default(''),
  phone:        z.string().trim().max(50).optional().default(''),
  couponCode:   z.string().trim().max(50).optional().default(''),
  seedData:     z.boolean().optional().default(false),
});

const projectDetailFields = {
  address:                  z.string().trim().max(500).optional().default(''),
  projectType:              z.string().trim().max(100).optional().default(''),
  builtUpArea:              z.string().trim().max(200).optional().default(''),
  estimatedStartDate:       z.string().nullable().optional(),
  estimatedDurationMonths:  z.number().int().min(0).nullable().optional(),
  tenderedCost:             nonNegNumber('tenderedCost').nullable().optional(),
  projectManager:           z.string().trim().max(200).optional().default(''),
  clientContactName:        z.string().trim().max(200).optional().default(''),
  clientContactEmail:       z.string().trim().max(300).optional().default(''),
  clientContactPhone:       z.string().trim().max(50).optional().default(''),
  projectRemarks:           z.string().trim().max(2000).optional().default(''),
};

export const ProjectCreateSchema = z.object({
  name:   trimmedString('name'),
  client: z.string().trim().max(200).optional().default(''),
  budget: nonNegNumber('budget').optional().default(0),
  ...projectDetailFields,
});

export const ProjectUpdateSchema = z
  .object({
    name:   trimmedString('name').optional(),
    client: z.string().trim().max(200).optional(),
    budget: nonNegNumber('budget').optional(),
    status: z.enum(['Active', 'On Hold', 'Completed']).optional(),
    ...projectDetailFields,
  })
  .refine(o => Object.keys(o).length > 0, { message: 'No valid fields' });

export const PackageCreateSchema = z.object({
  projectId: trimmedString('projectId'),
  name: trimmedString('name'),
  category: z.string().trim().max(100).optional().default(''),
  origin: origin.optional().default('Domestic'),
  currency: currency.optional().default('INR'),
});

export const PackageUpdateSchema = z
  .object({
    currentStage: stage.optional(),
    awardValue: nonNegNumber('awardValue').optional(),
    awardedVendorId: z.string().nullable().optional(),
  })
  .refine(o => Object.keys(o).length > 0, { message: 'No valid fields' });

export const AwardSchema = z.object({
  awardValue: nonNegNumber('awardValue'),
  awardedVendor: trimmedString('awardedVendor'),
});

export const VendorCreateSchema = z.object({
  name: trimmedString('name'),
  quoted: nonNegNumber('quoted'),
  revised: nonNegNumber('revised'),
});

export const VendorUpdateSchema = z
  .object({
    name: trimmedString('name').optional(),
    quotedAmount: nonNegNumber('quotedAmount').optional(),
    revisedAmount: nonNegNumber('revisedAmount').optional(),
  })
  .refine(o => Object.keys(o).length > 0, { message: 'No valid fields' });

export const RemarkCreateSchema = z.object({
  text: trimmedString('text', 1, 2000),
  imageUrls:  z.array(z.string().max(1000)).max(10).optional(),
  imageBytes: z.number().int().min(0).optional(),
});

export const DocumentCreateSchema = z.object({
  name: trimmedString('name'),
  size: z.string().max(50).optional().default(''),
  sizeBytes: z.number().int().min(0).optional().default(0),
  type: z.string().max(200).optional().default(''),
  storagePath: z.string().max(1000).optional().default(''),
});

export const InvoiceCreateSchema = z.object({
  amount: nonNegNumber('amount'),
  invoiceNumber: z.string().trim().max(100).optional().default(''),
  invoiceDate: z.string().optional(),
  notes: z.string().trim().max(1000).optional().default(''),
});

export const CategoryCreateSchema = z.object({
  name: trimmedString('name', 1, 100),
});

export const CategoryUpdateSchema = z.object({
  name: trimmedString('name', 1, 100),
});

export const CompanyUpdateSchema = z.object({
  name: trimmedString('name').optional().default('Procurement Dashboard'),
  tagline: z.string().max(200).optional().default(''),
  logoUrl: z.string().max(500).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal('')),
  primaryColor: z.string().max(20).optional().nullable(),
  defaultCurrency: z.enum(['INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD']).optional().default('INR'),
});

export const UserCreateSchema = z.object({
  username: trimmedString('username', 3, 50),
  password: z.string().min(8, 'password must be at least 8 chars'),
  fullName: trimmedString('fullName').optional(),
  role: role.optional().default('user'),
  canEdit: z.boolean().optional().default(false),
});

export const UserUpdateSchema = z
  .object({
    fullName: trimmedString('fullName').optional(),
    role: role.optional(),
    canEdit: z.boolean().optional(),
    password: z.string().min(8, 'password must be at least 8 chars').optional(),
  })
  .refine(o => Object.keys(o).length > 0, { message: 'No valid fields' });

export type Parsed<T extends ZodSchema> = z.infer<T>;

export async function parseBody<T extends ZodSchema>(
  req: Request,
  schema: T
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Invalid request';
    return { ok: false, response: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { ok: true, data: result.data };
}

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ==================== BASE VALIDATION SCHEMAS ====================

const VALID_DRAW_NAMES = [
  "Reveil", "Etoile", "Akwaba", "Monday Special",
  "La Matinale", "Emergence", "Sika", "Lucky Tuesday",
  "Premiere Heure", "Fortune", "Baraka", "Midweek",
  "Kado", "Privilege", "Monni", "Fortune Thursday",
  "Cash", "Solution", "Wari", "Friday Bonanza",
  "Soutra", "Diamant", "Moaye", "National",
  "Benediction", "Prestige", "Awale", "Espoir"
];

// Helper to normalize strings for accent-insensitive and case-insensitive comparison
const normalizeStr = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Draw name validation schema with flexible matching
export const drawNameSchema = z.string()
  .trim()
  .min(1, 'Draw name is required')
  .max(50, 'Draw name must be less than 50 characters')
  .transform((val) => {
    const match = VALID_DRAW_NAMES.find(n => normalizeStr(n) === normalizeStr(val));
    return match || val;
  })
  .refine(
    (val) => VALID_DRAW_NAMES.includes(val) || VALID_DRAW_NAMES.some(n => normalizeStr(n) === normalizeStr(val)),
    { message: 'Nom de tirage inconnu ou invalide dans le programme' }
  );

// User ID validation schema
export const userIdSchema = z.string()
  .trim()
  .uuid('Invalid user ID format')
  .optional();

// Analysis depth validation schema
export const analysisDepthSchema = z.number()
  .int('Analysis depth must be an integer')
  .min(10, 'Analysis depth must be at least 10')
  .max(1000, 'Analysis depth cannot exceed 1000')
  .optional()
  .default(100);

// Draw date validation schema
export const drawDateSchema = z.string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Draw date must be in YYYY-MM-DD format')
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date >= new Date('2020-01-01');
    },
    { message: 'Draw date must be a valid date after 2020-01-01' }
  )
  .optional();

// Draw names array validation schema
export const drawNamesArraySchema = z.array(drawNameSchema)
  .min(1, 'At least one draw name is required')
  .max(10, 'Maximum 10 draw names allowed')
  .refine(
    (names) => new Set(names).size === names.length,
    { message: 'Draw names must be unique' }
  );

// Boolean flag validation schema
export const booleanFlagSchema = z.boolean()
  .optional()
  .default(false);

// ==================== REQUEST SCHEMAS ====================

// Standard prediction request
export const predictionRequestSchema = z.object({
  drawName: drawNameSchema,
  analysisDepth: analysisDepthSchema,
  useSmartEnsemble: booleanFlagSchema,
  useAIOrchestration: booleanFlagSchema,
}).passthrough();

// Personalized prediction request
export const personalizedPredictionRequestSchema = z.object({
  drawName: drawNameSchema,
  userId: userIdSchema,
  analysisDepth: analysisDepthSchema,
}).passthrough();

// Multi-draw prediction request
export const multiDrawPredictionRequestSchema = z.object({
  drawNames: drawNamesArraySchema,
  budgetPerDraw: z.number().int().min(100).max(100000).optional().default(1000),
}).passthrough();

// Auto-tune request
export const autoTuneRequestSchema = z.object({
  drawName: drawNameSchema.optional(),
  forceRetrain: booleanFlagSchema,
}).passthrough();

// Evaluate predictions request
export const evaluatePredictionsRequestSchema = z.object({
  drawName: drawNameSchema.optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
}).passthrough();

// Adaptive orchestration request
export const adaptiveOrchestrationRequestSchema = z.object({
  drawName: drawNameSchema,
  drawDate: drawDateSchema,
  forceAdjustment: booleanFlagSchema,
}).passthrough();

// Algorithm comparison request
export const algorithmComparisonRequestSchema = z.object({
  drawName: drawNameSchema,
  includeMetrics: booleanFlagSchema,
}).passthrough();

// Best algorithm selection request
export const bestAlgorithmRequestSchema = z.object({
  drawName: drawNameSchema,
  minPredictions: z.number().int().min(1).max(100).optional().default(10),
}).passthrough();

// Prediction feedback request
export const predictionFeedbackRequestSchema = z.object({
  predictionId: z.string().uuid('Invalid prediction ID format'),
  actualNumbers: z.array(z.number().int().min(1).max(90))
    .length(5, 'Exactly 5 numbers required')
    .refine(
      (nums) => new Set(nums).size === 5,
      { message: 'Numbers must be unique' }
    ),
  userRating: z.number().int().min(1).max(5).optional(),
}).passthrough();

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// Convenience function for draw name validation
export function validateDrawName(drawName: unknown): { success: true; data: string } | { success: false; error: string } {
  return validateRequest(drawNameSchema, drawName);
}

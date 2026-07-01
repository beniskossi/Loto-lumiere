import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ==================== BASE VALIDATION SCHEMAS ====================

// Draw name validation schema with strict constraints
export const drawNameSchema = z.string()
  .trim()
  .min(1, 'Draw name is required')
  .max(50, 'Draw name must be less than 50 characters')
  .regex(/^[a-zA-Z0-9\s\u00C0-\u017F-]+$/, 'Draw name can only contain letters, numbers, spaces, accents, and hyphens')
  .refine(
    (val) => val.length > 0 && val.length <= 50,
    { message: 'Draw name length must be between 1 and 50 characters' }
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
}).strict();

// Personalized prediction request
export const personalizedPredictionRequestSchema = z.object({
  drawName: drawNameSchema,
  userId: userIdSchema,
  analysisDepth: analysisDepthSchema,
}).strict();

// Multi-draw prediction request
export const multiDrawPredictionRequestSchema = z.object({
  drawNames: drawNamesArraySchema,
  budgetPerDraw: z.number().int().min(100).max(100000).optional().default(1000),
}).strict();

// Auto-tune request
export const autoTuneRequestSchema = z.object({
  drawName: drawNameSchema.optional(),
  forceRetrain: booleanFlagSchema,
}).strict();

// Evaluate predictions request
export const evaluatePredictionsRequestSchema = z.object({
  drawName: drawNameSchema.optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
}).strict();

// Adaptive orchestration request
export const adaptiveOrchestrationRequestSchema = z.object({
  drawName: drawNameSchema,
  drawDate: drawDateSchema,
  forceAdjustment: booleanFlagSchema,
}).strict();

// Algorithm comparison request
export const algorithmComparisonRequestSchema = z.object({
  drawName: drawNameSchema,
  includeMetrics: booleanFlagSchema,
}).strict();

// Best algorithm selection request
export const bestAlgorithmRequestSchema = z.object({
  drawName: drawNameSchema,
  minPredictions: z.number().int().min(1).max(100).optional().default(10),
}).strict();

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
}).strict();

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

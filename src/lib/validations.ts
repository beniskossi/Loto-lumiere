import { z } from "zod";

// Validation des numéros de loterie
export const lotteryNumberSchema = z.number().int().min(1).max(90);

export const lotteryNumbersSchema = z
  .array(lotteryNumberSchema)
  .length(5, "Exactement 5 numéros requis")
  .refine((nums) => new Set(nums).size === 5, "Les numéros doivent être uniques");

// Validation des prédictions
export const predictionSchema = z.object({
  drawName: z.string().min(1, "Nom du tirage requis"),
  numbers: lotteryNumbersSchema,
  confidence: z.number().min(0).max(1).optional(),
  algorithm: z.string().optional(),
});

// Validation des favoris
export const favoriteSchema = z.object({
  user_id: z.string().uuid("ID utilisateur invalide"),
  draw_name: z.string().min(1, "Nom du tirage requis"),
  favorite_numbers: lotteryNumbersSchema,
  notes: z.string().max(500, "Notes trop longues (max 500 caractères)").nullable().optional(),
  category: z.enum(["personnel", "famille", "anniversaire", "chance", "analyse"]).optional(),
});

// Validation des résultats de tirage
export const drawResultSchema = z.object({
  draw_name: z.string().min(1, "Nom du tirage requis"),
  draw_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  winning_numbers: lotteryNumbersSchema,
  machine_numbers: lotteryNumbersSchema.nullable().optional(),
});

// Validation des préférences utilisateur
export const userPreferencesSchema = z.object({
  preferred_draw_name: z.string().optional(),
  notification_enabled: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

// Validation du mot de passe avec exigences de sécurité renforcées
export const passwordSchema = z.string()
  .min(8, "Mot de passe trop court (min 8 caractères)")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre"
  );

// Validation de l'authentification
export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (min 8 caractères)"),
});

export const signupPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
  password: passwordSchema,
});

export const signupSchema = signupPasswordSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Validation des notes
export const noteSchema = z.object({
  content: z.string().min(1).max(1000, "Note trop longue (max 1000 caractères)"),
});

// Helper pour valider et retourner les erreurs
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }
  return {
    success: true,
    data: result.data,
  };
};

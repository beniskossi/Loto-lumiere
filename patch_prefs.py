import sys

file_path = "src/hooks/useUserPreferences.ts"
with open(file_path, "r") as f:
    content = f.read()

target1 = "notification_time?: string;"
content = content.replace(target1, "")

target2 = '.select("id, user_id, has_completed_onboarding, preferred_draw_name, notification_enabled, notification_time, preferred_algorithm, theme_primary_color, theme_accent_color, custom_layout, created_at, updated_at")'
replacement2 = '.select("id, user_id, has_completed_onboarding, preferred_draw_name, notification_enabled, preferred_algorithm, theme_primary_color, theme_accent_color, custom_layout, created_at, updated_at")'
content = content.replace(target2, replacement2)

target3 = """export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: Partial<Omit<UserPreferences, "id" | "created_at" | "updated_at" | "user_id">>
    }) => {
      const { data, error } = await supabase
        .from("user_preferences")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();"""

replacement3 = """export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: Partial<Omit<UserPreferences, "id" | "created_at" | "updated_at" | "user_id">>
    }) => {
      const { data, error } = await supabase
        .from("user_preferences")
        .update(updates as any)
        .eq("user_id", userId)
        .select()
        .single();"""
content = content.replace(target3, replacement3)

with open(file_path, "w") as f:
    f.write(content)

print("Patched useUserPreferences.ts")

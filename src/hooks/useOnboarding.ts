import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences, useUpdatePreferences } from "@/hooks/useUserPreferences";

export const useOnboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(user?.id);
  const updatePreferences = useUpdatePreferences();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // 1. If auth is still loading, or we have a user but their preferences are still loading, do not trigger onboarding yet
    if (authLoading || (user && prefsLoading)) {
      return;
    }

    // 2. Check localStorage first as a quick local override/fallback
    const completedLocal = localStorage.getItem("onboarding_completed");
    if (completedLocal === "true") {
      setShowOnboarding(false);
      return;
    }

    // 3. For logged-in users, check DB preference
    if (user && preferences !== undefined) {
      if (preferences === null || !preferences.has_completed_onboarding) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
        // Sync to localStorage for instant loading on future refreshes
        localStorage.setItem("onboarding_completed", "true");
      }
      return;
    }

    // 4. For anonymous users, check localStorage
    if (!user) {
      if (completedLocal === "true") {
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    }
  }, [user, authLoading, preferences, prefsLoading]);

  const completeOnboarding = useCallback(async () => {
    setShowOnboarding(false);
    localStorage.setItem("onboarding_completed", "true");

    if (user) {
      try {
        await updatePreferences.mutateAsync({
          userId: user.id,
          preferences: { has_completed_onboarding: true },
        });
      } catch (e) {
        console.warn("Could not save onboarding status to database:", e);
      }
    }
  }, [user, updatePreferences]);

  return { showOnboarding, completeOnboarding };
};

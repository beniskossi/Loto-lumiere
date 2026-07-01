import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Clock, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences, useUpdatePreferences } from "@/hooks/useUserPreferences";
import { toast } from "sonner";

export const NotificationSettings = () => {
  const { user } = useAuth();
  const { data: preferences } = useUserPreferences(user?.id);
  const updatePreferences = useUpdatePreferences();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState("18:00");
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
    if (preferences) {
      setNotificationsEnabled(preferences.notification_enabled);
      setNotificationTime(preferences.notification_time || "18:00");
    }
  }, [preferences]);

  const requestNotificationPermission = async () => {
    if (!pushSupported) {
      toast.error("Les notifications ne sont pas supportées sur ce navigateur");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      toast.success("Notifications activées");
      return true;
    } else {
      toast.error("Permission refusée pour les notifications");
      return false;
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && !notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }

    setNotificationsEnabled(enabled);
    
    if (user) {
      await updatePreferences.mutateAsync({
        userId: user.id,
        preferences: { 
          notification_enabled: enabled,
          notification_time: notificationTime
        }
      });
    }
  };

  const handleTimeChange = async (time: string) => {
    setNotificationTime(time);
    
    if (user) {
      await updatePreferences.mutateAsync({
        userId: user.id,
        preferences: { notification_time: time }
      });
    }
  };

  const testNotification = () => {
    if (notificationsEnabled && pushSupported) {
      new Notification("Loto Lumière", {
        body: "Test de notification - Nouveaux résultats disponibles!",
        icon: "/icon-192.png",
        badge: "/icon-192.png"
      });
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Notifications
        </CardTitle>
        <CardDescription>
          Recevez des alertes pour les nouveaux résultats et prédictions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications">Activer les notifications</Label>
            <p className="text-sm text-muted-foreground">
              Recevez des notifications push pour les nouveaux tirages
            </p>
          </div>
          <Switch
            id="notifications"
            checked={notificationsEnabled}
            onCheckedChange={handleToggleNotifications}
            disabled={!pushSupported}
          />
        </div>

        {notificationsEnabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="notification-time">Heure de notification</Label>
              <Select value={notificationTime} onValueChange={handleTimeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">08:00 - Matin</SelectItem>
                  <SelectItem value="12:00">12:00 - Midi</SelectItem>
                  <SelectItem value="16:00">16:00 - Après-midi</SelectItem>
                  <SelectItem value="18:00">18:00 - Soir</SelectItem>
                  <SelectItem value="20:00">20:00 - Soirée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              onClick={testNotification}
              className="w-full gap-2"
            >
              <Zap className="w-4 h-4" />
              Tester les notifications
            </Button>
          </>
        )}

        {!pushSupported && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Les notifications push ne sont pas supportées sur ce navigateur
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
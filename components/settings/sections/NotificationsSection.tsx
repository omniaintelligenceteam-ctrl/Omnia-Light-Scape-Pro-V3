import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { ToggleRow } from '../ui/SettingsToggle';
import { NotificationPreferences } from '../../../types';

interface NotificationsSectionProps {
  notifications: NotificationPreferences;
  onNotificationsChange?: (prefs: NotificationPreferences) => void;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  notifications,
  onNotificationsChange
}) => {
  return (
    <motion.div
      key="notifications"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400 mb-6">
        Control how and when you receive notifications.
      </p>

      <SettingsCard className="p-6 space-y-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Email Notifications
        </h3>
        <ToggleRow
          icon={Mail}
          iconColor="text-blue-400"
          title="Project Updates"
          description="Get notified when projects are updated"
          checked={notifications.emailProjectUpdates}
          onChange={(v) => onNotificationsChange?.({ ...notifications, emailProjectUpdates: v })}
        />
        <ToggleRow
          icon={MessageCircle}
          iconColor="text-amber-400"
          title="Quote Reminders"
          description="Receive reminders for pending quotes"
          checked={notifications.emailQuoteReminders}
          onChange={(v) => onNotificationsChange?.({ ...notifications, emailQuoteReminders: v })}
        />
      </SettingsCard>

      <SettingsCard className="p-6 space-y-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Other
        </h3>
        <ToggleRow
          icon={Sparkles}
          iconColor="text-purple-400"
          title="Marketing Emails"
          description="Product updates, tips, and offers"
          checked={notifications.marketingEmails}
          onChange={(v) => onNotificationsChange?.({ ...notifications, marketingEmails: v })}
        />
        <ToggleRow
          icon={notifications.soundEffects ? Volume2 : VolumeX}
          iconColor="text-rose-400"
          title="Sound Effects"
          description="Play sounds for notifications"
          checked={notifications.soundEffects}
          onChange={(v) => onNotificationsChange?.({ ...notifications, soundEffects: v })}
        />
      </SettingsCard>
    </motion.div>
  );
};

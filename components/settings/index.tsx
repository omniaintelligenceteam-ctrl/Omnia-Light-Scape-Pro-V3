import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { SettingsMobile } from './SettingsMobile';
import { SettingsDesktop } from './SettingsDesktop';
import { SettingsViewProps, SubscriptionInfo } from './types';
import { createPortalSession } from '../../services/stripeservice';

// Re-export types for backward compatibility
export type { SettingsViewProps, SubscriptionInfo };

export const SettingsView: React.FC<SettingsViewProps> = (props) => {
  const isMobile = useIsMobile();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleManageSubscription = async () => {
    if (!props.userId) return;

    setIsLoadingPortal(true);
    try {
      const { url } = await createPortalSession(props.userId);
      window.location.href = url;
    } catch (err) {
      console.error('Failed to open billing portal:', err);
      setIsLoadingPortal(false);
    }
  };

  const enhancedProps = {
    ...props,
    onManageSubscription: handleManageSubscription,
    isLoadingPortal
  };

  if (isMobile) {
    return <SettingsMobile {...enhancedProps} />;
  }

  return <SettingsDesktop {...enhancedProps} />;
};

// Default export for backward compatibility
export default SettingsView;

import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

export function useUserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !user) return;

      try {
        const response = await fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clerkUserId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
          }),
        });

        if (!response.ok) {
          console.error('Failed to sync user:', await response.text());
        } else {
          console.log('User synced to database');
        }
      } catch (error) {
        console.error('Error syncing user:', error);
      }
    }

    syncUser();
  }, [user, isLoaded]);
}

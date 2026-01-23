import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';

export function useUserSync() {
  const { user, isLoaded } = useUser();
  const syncingRef = useRef(false);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !user) return;

      // Prevent duplicate syncs for the same user
      if (syncingRef.current || syncedUserIdRef.current === user.id) return;

      syncingRef.current = true;

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
          syncedUserIdRef.current = user.id;
        }
      } catch (error) {
        console.error('Error syncing user:', error);
      } finally {
        syncingRef.current = false;
      }
    }

    syncUser();
  }, [user, isLoaded]);
}

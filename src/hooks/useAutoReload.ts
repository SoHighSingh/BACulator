import { useEffect, useRef } from 'react';

interface UseAutoReloadOptions {
  intervalMinutes?: number;
  enabled?: boolean;
  showNotification?: boolean;
  onRefresh?: () => void | Promise<void>;
}

export function useAutoReload({
  intervalMinutes = 1,
  enabled = true,
  showNotification = true,
  onRefresh
}: UseAutoReloadOptions = {}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const intervalMs = intervalMinutes * 60 * 1000;

    const scheduleRefresh = () => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }

      // Schedule the refresh
      intervalRef.current = setTimeout(() => {
        // Show notification if enabled
        if (showNotification && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('BACulator', {
            body: 'Refreshing data...',
            icon: '/BACULATOR.png'
          });
        }

        // Call the refresh function instead of reloading
        if (onRefresh) {
          void onRefresh();
        }
        
        // Schedule the next refresh
        scheduleRefresh();
      }, intervalMs);
    };

    // Start the auto-refresh
    scheduleRefresh();

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      if (notificationRef.current) {
        clearTimeout(notificationRef.current);
        notificationRef.current = null;
      }
    };
  }, [intervalMinutes, enabled, showNotification, onRefresh]);

  // Function to manually trigger refresh
  const triggerRefresh = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
    if (onRefresh) {
      void onRefresh();
    }
  };

  // Function to pause/resume auto-refresh
  const pauseAutoRefresh = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resumeAutoRefresh = () => {
    if (enabled && !intervalRef.current) {
      const intervalMs = intervalMinutes * 60 * 1000;
      intervalRef.current = setTimeout(() => {
        if (onRefresh) {
          void onRefresh();
        }
        resumeAutoRefresh(); // Schedule next refresh
      }, intervalMs);
    }
  };

  return {
    triggerRefresh,
    pauseAutoRefresh,
    resumeAutoRefresh
  };
} 
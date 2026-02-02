import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutOptions {
  timeout: number; // in milliseconds
  onIdle: () => void;
  enabled?: boolean;
}

export const useIdleTimeout = ({ timeout, onIdle, enabled = true }: UseIdleTimeoutOptions) => {
  const timeoutRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      onIdle();
    }, timeout);
  }, [timeout, onIdle, enabled]);

  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;
    
    if (document.hidden) {
      // Tab is hidden - start timeout from now
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        onIdle();
      }, timeout);
    } else {
      // Tab is visible again - check if timeout has passed
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= timeout) {
        onIdle();
      } else {
        // Reset timer with remaining time
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
          onIdle();
        }, timeout - timeSinceLastActivity);
      }
    }
  }, [timeout, onIdle, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Activity events to track
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners for user activity
    activityEvents.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start initial timer
    resetTimer();

    return () => {
      // Cleanup
      activityEvents.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer, handleVisibilityChange, enabled]);

  return { resetTimer };
};

import { useEffect } from 'react';

/**
 * Subscribes to an IPC channel and auto-cleans up on unmount.
 * Usage:
 *   useIpc('compress:progress', (data) => { ... });
 */
export function useIpc(channel: string, handler: (...args: any[]) => void) {
  useEffect(() => {
    window.api.on(channel, handler);
    return () => window.api.off(channel, handler);
  }, [channel, handler]);
}

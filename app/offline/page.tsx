"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      // Redirect back to dashboard when online
      window.location.href = '/dashboard';
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
          className="mb-8"
        >
          <div className="p-6 bg-zinc-800/50 rounded-full inline-block">
            <WifiOff className="h-16 w-16 text-zinc-400" />
          </div>
        </motion.div>

        <h1 className="text-3xl font-bold mb-4">You&apos;re Offline</h1>
        
        <p className="text-zinc-400 mb-8">
          It looks like you&apos;ve lost your internet connection. 
          Don&apos;t worry - your changes are saved locally and will sync when you&apos;re back online.
        </p>

        <div className="space-y-4">
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
            <Cloud className="h-4 w-4" />
            <span>Changes will auto-sync when connected</span>
          </div>
        </div>

        <div className="mt-12 p-4 bg-zinc-800/30 rounded-lg">
          <h3 className="font-medium mb-2">What you can do offline:</h3>
          <ul className="text-sm text-zinc-400 space-y-1 text-left">
            <li>✓ View cached data</li>
            <li>✓ Create new items (will sync later)</li>
            <li>✓ Edit existing items</li>
            <li>✓ Use keyboard shortcuts</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}



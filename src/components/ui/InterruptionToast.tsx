/**
 * InterruptionToast.tsx
 * -----------------------------------------------
 * Toast notification system for interruption events:
 * - Offline / connectivity lost
 * - Idle timeout (5 min)
 * - Back online
 * -----------------------------------------------
 * spine-hangar interruption awareness
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, Clock, X } from 'lucide-react';
import { sessionService, type InterruptionType } from '../../services/sessionService';

// -- Toast data model --

interface ToastData {
  id: string;
  type: 'offline' | 'idle' | 'online';
  message: string;
  icon: React.ReactNode;
  persistent: boolean;
  colorClass: string;
}

// -- Toast configs --

function createToast(type: InterruptionType | 'online'): ToastData | null {
  const id = `${type}_${Date.now()}`;

  switch (type) {
    case 'connectivity_lost':
      return {
        id,
        type: 'offline',
        message: "You're offline -- progress is saved locally and will sync when you reconnect.",
        icon: <WifiOff className="w-4 h-4" />,
        persistent: true,
        colorClass: 'border-amber-500/40 bg-amber-900/30 text-amber-300',
      };

    case 'idle_timeout':
      return {
        id,
        type: 'idle',
        message: 'Session auto-saved. Safe to leave anytime.',
        icon: <Clock className="w-4 h-4" />,
        persistent: false,
        colorClass: 'border-blue-500/40 bg-blue-900/30 text-blue-300',
      };

    case 'online':
      return {
        id,
        type: 'online',
        message: "Back online -- you're all set.",
        icon: <Wifi className="w-4 h-4" />,
        persistent: false,
        colorClass: 'border-green-500/40 bg-green-900/30 text-green-300',
      };

    default:
      return null;
  }
}

// -- Component --

export function InterruptionToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((type: InterruptionType | 'online') => {
    const toast = createToast(type);
    if (!toast) return;

    setToasts(prev => {
      // Remove existing same-type toasts to prevent duplicates
      const filtered = prev.filter(t => t.type !== toast.type);

      // If coming back online, also remove the offline toast
      if (type === 'online') {
        return [...filtered.filter(t => t.type !== 'offline'), toast];
      }

      return [...filtered, toast];
    });

    // Auto-dismiss non-persistent toasts after 5 seconds
    if (!toast.persistent) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 5000);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Subscribe to sessionService interruption events
  useEffect(() => {
    const unsub = sessionService.onInterruption((type) => {
      addToast(type);
    });
    return unsub;
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg ${toast.colorClass}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.icon}
            </div>
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

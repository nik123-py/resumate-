/**
 * Modal.tsx
 * -----------------------------------------------
 * Overlay modal component. Clean surface with
 * subtle backdrop, no excessive blur.
 * -----------------------------------------------
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}: ModalProps) {
  /* -- Lock body scroll when open -- */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* -- Backdrop -- */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* -- Modal panel -- */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className={`bg-surface-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-hidden`}
            >
              {/* -- Header with title -- */}
              {title && (
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/60">
                  <h2 className="text-lg font-semibold text-slate-100">
                    {title}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* -- Body -- */}
              <div className="p-6 overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

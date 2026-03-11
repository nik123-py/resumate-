/**
 * Button.tsx
 * -----------------------------------------------
 * Core button component. Flat solid colors with
 * teal accent. No gradients, no colored shadows.
 * -----------------------------------------------
 */

import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  /* -- Base styles shared by all variants -- */
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-950 disabled:opacity-50 disabled:cursor-not-allowed';

  /* -- Variant-specific styles (flat, no gradients) -- */
  const variantClasses = {
    primary:
      'bg-teal-600 hover:bg-teal-500 text-white focus:ring-teal-500/50',
    secondary:
      'bg-slate-700 hover:bg-slate-600 text-slate-100 focus:ring-slate-500/40',
    ghost:
      'text-slate-300 hover:text-white hover:bg-slate-800 focus:ring-slate-500/30',
    danger:
      'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500/50',
  };

  /* -- Size classes -- */
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Card.tsx
 * -----------------------------------------------
 * Surface container component. Uses warm slate
 * tones, subtle border, no excessive blur.
 * -----------------------------------------------
 */

import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  const Component = hover ? motion.div : 'div';

  /* -- Subtle lift on hover, no scale transform -- */
  const motionProps = hover
    ? {
        whileHover: { y: -3 },
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <Component
      className={`bg-surface-900 border border-slate-700/60 rounded-xl p-6 ${className}`}
      {...motionProps}
    >
      {children}
    </Component>
  );
}

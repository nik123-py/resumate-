/**
 * CVCard.tsx
 * -----------------------------------------------
 * Resume card shown in the dashboard grid.
 * Warm surface colors, clean hover actions.
 * -----------------------------------------------
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Edit, Copy, Trash2, Download, Share2, Eye } from 'lucide-react';
import type { CVData } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CVCardProps {
  cv: CVData;
  onEdit: (cv: CVData) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (cv: CVData) => void;
}

export function CVCard({ cv, onEdit, onDuplicate, onDelete, onPreview }: CVCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card className="relative group cursor-pointer" hover>
      <div onClick={() => onEdit(cv)} className="space-y-4">
        {/* CV Preview Thumbnail */}
        <div className="aspect-[3/4] bg-surface-950 rounded-lg border border-slate-700/40 overflow-hidden">
          <div className="p-4 space-y-2 text-xs">
            <div className="h-2 bg-slate-700 rounded w-3/4"></div>
            <div className="h-1 bg-slate-800 rounded w-1/2"></div>
            <div className="space-y-1 mt-4">
              <div className="h-1 bg-slate-800 rounded"></div>
              <div className="h-1 bg-slate-800 rounded w-5/6"></div>
              <div className="h-1 bg-slate-800 rounded w-4/6"></div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-slate-100 truncate">{cv.title}</h3>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Updated {formatDate(cv.updatedAt)}</span>
            <span className="capitalize px-2 py-0.5 bg-slate-800 rounded text-slate-400">
              {cv.templateId}
            </span>
          </div>
        </div>
      </div>

      {/* Action Menu */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 bg-surface-900/80"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>

          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-1 w-44 bg-surface-900 border border-slate-700/60 rounded-lg shadow-xl py-1 z-10"
            >
              <DropdownItem icon={<Edit className="w-4 h-4" />} onClick={(e) => { e.stopPropagation(); onEdit(cv); setShowMenu(false); }}>
                Edit
              </DropdownItem>
              <DropdownItem icon={<Eye className="w-4 h-4" />} onClick={(e) => { e.stopPropagation(); onPreview(cv); setShowMenu(false); }}>
                Preview
              </DropdownItem>
              <DropdownItem icon={<Copy className="w-4 h-4" />} onClick={(e) => { e.stopPropagation(); onDuplicate(cv.id); setShowMenu(false); }}>
                Duplicate
              </DropdownItem>
              <DropdownItem icon={<Download className="w-4 h-4" />} onClick={(e) => { e.stopPropagation(); }}>
                Download
              </DropdownItem>
              <DropdownItem icon={<Share2 className="w-4 h-4" />} onClick={(e) => { e.stopPropagation(); }}>
                Share
              </DropdownItem>
              <hr className="border-slate-700/60 my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this CV?')) {
                    onDelete(cv.id);
                  }
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-800 flex items-center space-x-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* -- Helper: Dropdown menu item -- */
function DropdownItem({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-800 flex items-center space-x-2 text-sm"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

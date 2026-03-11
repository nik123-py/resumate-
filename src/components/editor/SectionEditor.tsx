/**
 * SectionEditor.tsx
 * -----------------------------------------------
 * Renders individual CV section editing forms.
 * Tracks field focus events and reports them to
 * the session context for recovery support.
 * -----------------------------------------------
 */

import React, { useCallback } from 'react';
import { GripVertical, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import type { CVSection } from '../../types';
import { Button } from '../ui/Button';
import { ContactSection } from './sections/ContactSection';
import { SummarySection } from './sections/SummarySection';
import { ExperienceSection } from './sections/ExperienceSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { useSession } from '../../contexts/SessionContext';
import { globalSessionService } from '../../services/globalSessionService';

interface SectionEditorProps {
  section: CVSection;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleVisibility: () => void;
  onUpdateData: (data: any) => void;
  dragHandleProps?: any;
}

export function SectionEditor({
  section,
  isExpanded,
  onToggleExpanded,
  onToggleVisibility,
  onUpdateData,
  dragHandleProps
}: SectionEditorProps) {
  const { setPatch } = useSession();

  /**
   * Track focus events on inputs/textareas within this section.
   * Reports the focused field to session for recovery.
   */
  const handleFocusCapture = useCallback(
    (e: React.FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Build a field identifier from name, label, or placeholder
        const fieldId =
          target.getAttribute('data-field-id') ||
          target.getAttribute('name') ||
          target.getAttribute('placeholder') ||
          section.type;

        setPatch({
          activeSection: section.type,
          lastCursorField: `${section.type}_${fieldId}`,
        });

        // Track the exact edit location for welcome-back highlighting
        globalSessionService.trackLastEdit(section.type, section.title, fieldId);
      }
    },
    [section.type, section.title, setPatch]
  );

  const renderSectionContent = () => {
    switch (section.type) {
      case 'contact':
        return <ContactSection data={section.data} onUpdate={onUpdateData} />;
      case 'summary':
        return <SummarySection data={section.data} onUpdate={onUpdateData} />;
      case 'experience':
        return <ExperienceSection data={section.data} onUpdate={onUpdateData} />;
      case 'education':
        return <EducationSection data={section.data} onUpdate={onUpdateData} />;
      case 'skills':
        return <SkillsSection data={section.data} onUpdate={onUpdateData} />;
      default:
        return <div className="p-4 text-slate-400">Section type not implemented</div>;
    }
  };

  return (
    <div className="bg-surface-900 border border-slate-700/60 rounded-xl overflow-hidden">
      {/* -- Section header bar -- */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/60">
        <div className="flex items-center space-x-3">
          <button
            {...dragHandleProps}
            className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold text-slate-100">{section.title}</h3>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className="p-2"
          >
            {section.visible ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="p-2"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* -- Section content with focus tracking -- */}
      {isExpanded && (
        <div onFocusCapture={handleFocusCapture}>
          {renderSectionContent()}
        </div>
      )}
    </div>
  );
}

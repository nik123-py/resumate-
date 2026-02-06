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

        // Track globally for welcome-back briefing
        globalSessionService.trackAction('/editor', 'section_edited', section.title);
      }
    },
    [section.type, section.title, setPatch]
  );

  const renderSectionContent = () => {
    switch (section.type) {
      case 'contact':
        return (
          <ContactSection
            data={section.data}
            onUpdate={onUpdateData}
          />
        );
      case 'summary':
        return (
          <SummarySection
            data={section.data}
            onUpdate={onUpdateData}
          />
        );
      case 'experience':
        return (
          <ExperienceSection
            data={section.data}
            onUpdate={onUpdateData}
          />
        );
      case 'education':
        return (
          <EducationSection
            data={section.data}
            onUpdate={onUpdateData}
          />
        );
      case 'skills':
        return (
          <SkillsSection
            data={section.data}
            onUpdate={onUpdateData}
          />
        );
      default:
        return <div className="p-4 text-gray-400">Section type not implemented</div>;
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
      {/* -- Section header bar -- */}
      <div className="flex items-center justify-between p-4 bg-gray-800/30 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <button
            {...dragHandleProps}
            className="text-gray-400 hover:text-gray-300 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-100">{section.title}</h3>
        </div>

        <div className="flex items-center space-x-2">
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
        <div
          className="border-t border-gray-700/50"
          onFocusCapture={handleFocusCapture}
        >
          {renderSectionContent()}
        </div>
      )}
    </div>
  );
}

/**
 * CVEditor.tsx
 * -----------------------------------------------
 * Main CV editor page. Includes drag-and-drop
 * section reordering, live preview, and the
 * ProgressSidebar for session tracking.
 * -----------------------------------------------
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Download, Eye, ArrowLeft } from 'lucide-react';
import { useCV } from '../../contexts/CVContext';
import { useSession } from '../../contexts/SessionContext';
import { SectionEditor } from './SectionEditor';
import { ProgressSidebar } from './ProgressSidebar';
import { CVPreview } from '../preview/CVPreview';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { globalSessionService } from '../../services/globalSessionService';
import type { CVSection } from '../../types';

// -- Sortable section wrapper --

interface SortableSectionProps {
  section: CVSection;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleVisibility: () => void;
  onUpdateData: (data: any) => void;
}

function SortableSection({
  section,
  isExpanded,
  onToggleExpanded,
  onToggleVisibility,
  onUpdateData
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-section-id={section.type}
    >
      <SectionEditor
        section={section}
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
        onToggleVisibility={onToggleVisibility}
        onUpdateData={onUpdateData}
        dragHandleProps={listeners}
      />
    </div>
  );
}

// -- Main Editor Component --

export function CVEditor() {
  const navigate = useNavigate();
  const { currentCV, updateCV, reorderSections, updateSection } = useCV();
  const { setPatch, pushAction } = useSession();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['contact']));
  const [showPreview, setShowPreview] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Track scroll position for session recovery
  useEffect(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;

    const handleScroll = () => {
      setPatch({ scrollPosition: editorEl.scrollTop });
    };

    editorEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => editorEl.removeEventListener('scroll', handleScroll);
  }, [setPatch]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && currentCV) {
      const oldIndex = currentCV.sections.findIndex(section => section.id === active.id);
      const newIndex = currentCV.sections.findIndex(section => section.id === over.id);

      const newSections = arrayMove(currentCV.sections, oldIndex, newIndex).map((section, index) => ({
        ...section,
        order: index
      }));

      reorderSections(newSections);
      pushAction('reordered_sections');
    }
  }, [currentCV, reorderSections, pushAction]);

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        pushAction('section_collapsed', { section: sectionId });
      } else {
        newSet.add(sectionId);
        pushAction('section_expanded', { section: sectionId });

        // Track active section for recovery + global activity
        const section = currentCV?.sections.find(s => s.id === sectionId);
        if (section) {
          setPatch({ activeSection: section.type });
          globalSessionService.trackAction('/editor', 'section_edited', section.title);
        }
      }
      return newSet;
    });
  };

  const toggleSectionVisibility = (sectionId: string) => {
    if (!currentCV) return;

    const updatedSections = currentCV.sections.map(section =>
      section.id === sectionId ? { ...section, visible: !section.visible } : section
    );

    updateCV({ ...currentCV, sections: updatedSections });
  };

  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;

    const element = document.getElementById('cv-preview');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${currentCV?.title || 'Resume'}.pdf`);
      pushAction('exported_pdf');
      globalSessionService.trackAction('/editor', 'pdf_exported', currentCV?.title || 'Resume');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // No CV selected state
  if (!currentCV) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No CV selected</p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* -- Editor Header Bar -- */}
      <div className="sticky top-0 z-40 bg-surface-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <input
                type="text"
                value={currentCV.title}
                onChange={(e) => updateCV({ ...currentCV, title: e.target.value })}
                className="text-lg font-semibold bg-transparent text-slate-100 border-none outline-none focus:bg-surface-800 px-2 py-1 rounded"
              />
              <p className="text-xs text-slate-500 ml-2">
                Last saved: {new Date(currentCV.updatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => setShowPreview(!showPreview)}
              className="p-2"
            >
              <Eye className="w-5 h-5" />
            </Button>
            <Button onClick={exportToPDF} className="px-4">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* -- Main Layout: Sidebar + Editor + Preview -- */}
      <div className="flex" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Progress Sidebar */}
        <ProgressSidebar />

        {/* Editor Panel */}
        <div
          ref={editorRef}
          className={`${showPreview ? 'w-1/2' : 'flex-1'} p-6 overflow-y-auto`}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={currentCV.sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {currentCV.sections
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      isExpanded={expandedSections.has(section.id)}
                      onToggleExpanded={() => toggleExpanded(section.id)}
                      onToggleVisibility={() => toggleSectionVisibility(section.id)}
                      onUpdateData={(data) => {
                        updateSection(section.id, data);
                        setPatch({ activeSection: section.type });
                        pushAction('edited_field', { section: section.type });
                      }}
                    />
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 p-6 border-l border-slate-800 bg-surface-900/30 overflow-y-auto">
            <div className="sticky top-0">
              <CVPreview cv={currentCV} className="transform scale-75 origin-top" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ExperienceSection.tsx
 * -----------------------------------------------
 * Work experience entries. Teal focus rings,
 * warm surface colors.
 * -----------------------------------------------
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import type { ExperienceItem } from '../../../types';

interface ExperienceSectionData {
  items: ExperienceItem[];
}

interface ExperienceSectionProps {
  data: ExperienceSectionData;
  onUpdate: (data: ExperienceSectionData) => void;
}

const createNewExperience = (): ExperienceItem => ({
  id: Date.now().toString(),
  company: '',
  position: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  description: ''
});

export function ExperienceSection({ data, onUpdate }: ExperienceSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['0']));

  const addExperience = () => {
    const newItem = createNewExperience();
    const updatedItems = [...(data.items || []), newItem];
    onUpdate({ items: updatedItems });
    setExpandedItems(prev => new Set(prev).add(newItem.id));
  };

  const updateExperience = (index: number, updates: Partial<ExperienceItem>) => {
    const updatedItems = data.items.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    );
    onUpdate({ items: updatedItems });
  };

  const removeExperience = (index: number) => {
    const updatedItems = data.items.filter((_, i) => i !== index);
    onUpdate({ items: updatedItems });
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="p-4 space-y-4">
      {data.items?.map((item, index) => (
        <div key={item.id} className="border border-slate-700/60 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleExpanded(item.id)}
              className="text-left flex-1"
            >
              <div className="font-medium text-slate-100 text-sm">
                {item.position || 'New Position'} {item.company && `at ${item.company}`}
              </div>
              <div className="text-xs text-slate-500">
                {item.startDate && (
                  <>
                    {item.startDate} - {item.current ? 'Present' : item.endDate || 'Present'}
                  </>
                )}
              </div>
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeExperience(index)}
              className="text-red-400 hover:text-red-300 p-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {expandedItems.has(item.id) && (
            <div className="space-y-4 pt-4 border-t border-slate-700/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Job Title"
                  value={item.position}
                  onChange={(e) => updateExperience(index, { position: e.target.value })}
                  placeholder="Software Engineer"
                />
                <Input
                  label="Company"
                  value={item.company}
                  onChange={(e) => updateExperience(index, { company: e.target.value })}
                  placeholder="Tech Corp"
                />
                <Input
                  label="Location"
                  value={item.location}
                  onChange={(e) => updateExperience(index, { location: e.target.value })}
                  placeholder="San Francisco, CA"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`current-${item.id}`}
                    checked={item.current}
                    onChange={(e) => updateExperience(index, { current: e.target.checked, endDate: e.target.checked ? '' : item.endDate })}
                    className="w-4 h-4 text-teal-600 bg-surface-800 border-slate-600 rounded focus:ring-teal-500"
                  />
                  <label htmlFor={`current-${item.id}`} className="text-sm text-slate-300">
                    I currently work here
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="month"
                  value={item.startDate}
                  onChange={(e) => updateExperience(index, { startDate: e.target.value })}
                />
                {!item.current && (
                  <Input
                    label="End Date"
                    type="month"
                    value={item.endDate}
                    onChange={(e) => updateExperience(index, { endDate: e.target.value })}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Job Description
                </label>
                <textarea
                  value={item.description}
                  onChange={(e) => updateExperience(index, { description: e.target.value })}
                  placeholder="Describe your responsibilities, achievements, and key contributions..."
                  className="w-full h-24 px-3 py-2 bg-surface-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600 transition-colors resize-none text-sm"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button onClick={addExperience} variant="ghost" className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Experience
      </Button>
    </div>
  );
}

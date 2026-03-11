/**
 * SummarySection.tsx
 * -----------------------------------------------
 * Professional summary textarea. Teal focus ring.
 * -----------------------------------------------
 */

/* Summary section editor */

interface SummarySectionData {
  content: string;
}

interface SummarySectionProps {
  data: SummarySectionData;
  onUpdate: (data: SummarySectionData) => void;
}

export function SummarySection({ data, onUpdate }: SummarySectionProps) {
  return (
    <div className="p-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Professional Summary
        </label>
        <textarea
          value={data.content || ''}
          onChange={(e) => onUpdate({ ...data, content: e.target.value })}
          placeholder="Write a compelling summary of your professional background, key skills, and career objectives..."
          className="w-full h-32 px-3 py-2 bg-surface-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600 transition-colors resize-none text-sm"
        />
      </div>
    </div>
  );
}

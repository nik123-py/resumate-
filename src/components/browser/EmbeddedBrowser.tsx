/**
 * EmbeddedBrowser.tsx
 * -----------------------------------------------
 * In-app browser workspace for tracking job
 * applications. Lists saved applications with
 * progress, allows adding new ones, and provides
 * a workspace overlay for quick copy-paste of
 * resume fields into external job applications.
 * -----------------------------------------------
 * spine-hangar application workspace
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Check,
  Briefcase,
  Clock,
  Bell,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useCV } from '../../contexts/CVContext';
import {
  applicationTracker,
  type ApplicationRecord,
} from '../../services/applicationTracker';

// -- Relative time formatter --
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// -- Status color config --
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  in_progress: { bg: 'bg-amber-900/30', text: 'text-amber-400' },
  submitted: { bg: 'bg-green-900/30', text: 'text-green-400' },
  abandoned: { bg: 'bg-gray-800', text: 'text-gray-500' },
};

// -- Workspace Overlay (copy resume fields) --

function WorkspaceOverlay({ onClose }: { onClose: () => void }) {
  const { currentCV } = useCV();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      console.error('[EmbeddedBrowser] clipboard copy failed', err);
    }
  };

  if (!currentCV) return null;

  // Extract fields from CV for quick copy
  const contact = currentCV.sections.find(s => s.type === 'contact')?.data;
  const summary = currentCV.sections.find(s => s.type === 'summary')?.data;
  const skills = currentCV.sections.find(s => s.type === 'skills')?.data;

  const fields = [
    { id: 'name', label: 'Full Name', value: contact?.fullName || '' },
    { id: 'email', label: 'Email', value: contact?.email || '' },
    { id: 'phone', label: 'Phone', value: contact?.phone || '' },
    { id: 'location', label: 'Location', value: contact?.location || '' },
    { id: 'linkedin', label: 'LinkedIn', value: contact?.linkedin || '' },
    { id: 'github', label: 'GitHub', value: contact?.github || '' },
    { id: 'summary', label: 'Summary', value: summary?.content || '' },
    { id: 'skills', label: 'Skills', value: skills?.items?.join(', ') || '' },
  ].filter(f => f.value);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-72 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-2xl max-h-[70vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">Quick Copy</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">
          Close
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Click to copy any field, then paste into the application form.
      </p>

      <div className="space-y-2">
        {fields.map((field) => (
          <button
            key={field.id}
            onClick={() => copyToClipboard(field.value, field.id)}
            className="w-full text-left p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                {field.label}
              </span>
              {copiedField === field.id ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <Copy className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            <p className="text-xs text-gray-300 mt-1 truncate">{field.value}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// -- Add Application Form --

interface AddFormProps {
  onAdd: (data: { jobTitle: string; company: string; sourceUrl: string; notes: string }) => void;
  onCancel: () => void;
}

function AddApplicationForm({ onAdd, onCancel }: AddFormProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <Card className="p-4 space-y-3 border-purple-500/30">
      <h4 className="text-sm font-semibold text-white">Track New Application</h4>
      <Input
        label="Job Title"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        placeholder="Frontend Developer"
      />
      <Input
        label="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="Acme Corp"
      />
      <Input
        label="Application URL"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="https://careers.acme.com/apply"
      />
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this application..."
          className="w-full h-16 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onAdd({ jobTitle, company, sourceUrl, notes })}
          disabled={!jobTitle.trim() || !company.trim()}
          size="sm"
          className="flex-1"
        >
          Add Application
        </Button>
        <Button variant="ghost" onClick={onCancel} size="sm">
          Cancel
        </Button>
      </div>
    </Card>
  );
}

// -- Main Component --

export function EmbeddedBrowser() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load applications on mount
  useEffect(() => {
    setApplications(applicationTracker.getAll());
  }, []);

  // Check for pending reminders
  const pendingReminders = useMemo(
    () => applicationTracker.getPendingReminders(),
    [applications]
  );

  const handleAdd = (data: { jobTitle: string; company: string; sourceUrl: string; notes: string }) => {
    applicationTracker.create({
      ...data,
      status: 'in_progress',
    });
    setApplications(applicationTracker.getAll());
    setShowAddForm(false);
  };

  const handleStatusChange = (id: string, status: ApplicationRecord['status']) => {
    applicationTracker.update(id, { status });
    setApplications(applicationTracker.getAll());
  };

  const handleRemove = (id: string) => {
    applicationTracker.remove(id);
    setApplications(applicationTracker.getAll());
  };

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowWorkspace(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Application Tracker</h1>
              <p className="text-sm text-gray-400">
                {applications.length} application{applications.length !== 1 ? 's' : ''} tracked
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowWorkspace(!showWorkspace)}
              size="sm"
            >
              <Globe className="w-4 h-4 mr-1" />
              Workspace
            </Button>
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Track Application
            </Button>
          </div>
        </div>

        {/* Pending reminders banner */}
        {pendingReminders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg flex items-center gap-3"
          >
            <Bell className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">
              {pendingReminders.length} application{pendingReminders.length > 1 ? 's' : ''} pending for over 24 hours.
              Don't forget to follow up!
            </p>
          </motion.div>
        )}

        <div className="flex gap-4">
          {/* Application List */}
          <div className="flex-1 space-y-3">
            {/* Add form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AddApplicationForm
                    onAdd={handleAdd}
                    onCancel={() => setShowAddForm(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Applications */}
            {applications.length === 0 && !showAddForm ? (
              <Card className="text-center py-10">
                <Briefcase className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No applications tracked yet</p>
                <p className="text-xs text-gray-500 mb-4">
                  Start tracking your job applications to stay organized
                </p>
                <Button onClick={() => setShowAddForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add First Application
                </Button>
              </Card>
            ) : (
              applications.map((app) => {
                const isExpanded = expandedId === app.id;
                const statusColor = STATUS_COLORS[app.status];
                const isPending = pendingReminders.some(r => r.id === app.id);

                return (
                  <motion.div
                    key={app.id}
                    layout
                    className={`bg-gray-800/50 border rounded-xl overflow-hidden ${
                      isPending ? 'border-amber-500/30' : 'border-gray-700/50'
                    }`}
                  >
                    {/* Card header */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                    >
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        app.status === 'in_progress' ? 'bg-amber-400' :
                        app.status === 'submitted' ? 'bg-green-400' : 'bg-gray-500'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {app.jobTitle}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor.bg} ${statusColor.text}`}>
                            {app.status.replace('_', ' ')}
                          </span>
                          {isPending && (
                            <Bell className="w-3 h-3 text-amber-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {app.company} -- {timeAgo(app.lastEditedAt)}
                        </p>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-700/50"
                        >
                          <div className="p-4 space-y-3">
                            {app.notes && (
                              <p className="text-xs text-gray-400">{app.notes}</p>
                            )}

                            {app.sourceUrl && (
                              <button
                                onClick={() => handleOpenUrl(app.sourceUrl)}
                                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Open application page
                              </button>
                            )}

                            <div className="flex gap-2 pt-2">
                              {app.status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleStatusChange(app.id, 'submitted')}
                                >
                                  Mark Submitted
                                </Button>
                              )}
                              {app.status !== 'abandoned' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStatusChange(app.id, 'abandoned')}
                                >
                                  Abandon
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 ml-auto"
                                onClick={() => handleRemove(app.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            <div className="text-[10px] text-gray-600 pt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              Created {new Date(app.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Workspace overlay (right side) */}
          <AnimatePresence>
            {showWorkspace && (
              <WorkspaceOverlay onClose={() => setShowWorkspace(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

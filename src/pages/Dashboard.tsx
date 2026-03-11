/**
 * Dashboard.tsx
 * -----------------------------------------------
 * Main dashboard page. Shows the resume recovery
 * card (if an active session exists), pending
 * application reminders, and the CV grid.
 * -----------------------------------------------
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Grid,
  List,
  ArrowRight,
  Bell,
  Briefcase,
} from 'lucide-react';
import { useCV } from '../contexts/CVContext';
import { useSession } from '../contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { CVCard } from '../components/dashboard/CVCard';
import { TemplateCard } from '../components/dashboard/TemplateCard';
import { Modal } from '../components/ui/Modal';
import { applicationTracker } from '../services/applicationTracker';
import { globalSessionService } from '../services/globalSessionService';
import type { CVData, Template } from '../types';

// -- Templates --
const templates: Template[] = [
  { id: 'minimal', name: 'Minimal', previewImage: '', category: 'minimal' },
  { id: 'modern', name: 'Modern', previewImage: '', category: 'modern' },
  { id: 'creative', name: 'Creative', previewImage: '', category: 'creative' },
];

// -- Mini progress ring for dashboard card --
function MiniRing({ progress, size = 40 }: { progress: number; size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#1e293b" strokeWidth="3" />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#14b8a6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text x={center} y={center + 3} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
        {progress}%
      </text>
    </svg>
  );
}

// -- Format time ago --
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// -- Main Component --

export function Dashboard() {
  const navigate = useNavigate();
  const { cvs, createCV, duplicateCV, deleteCV, setCurrentCV } = useCV();
  const { overallProgress, sessionData } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);

  // Pending application reminders
  const pendingReminders = useMemo(
    () => applicationTracker.getPendingReminders(),
    []
  );
  const inProgressApps = useMemo(
    () => applicationTracker.getInProgressCount(),
    []
  );

  const filteredCVs = cvs.filter(cv =>
    cv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find the last actively edited CV (the one with a session)
  const lastActiveCvId = sessionData?.cvId;
  const lastActiveCV = cvs.find(cv => cv.id === lastActiveCvId);
  const hasActiveSession = !!lastActiveCV && (sessionData?.actionLog?.length ?? 0) > 0;

  const handleCreateCV = () => {
    const newCV = createCV();
    const updatedCV = { ...newCV, templateId: selectedTemplate.id };
    setCurrentCV(updatedCV);
    setShowTemplateModal(false);
    globalSessionService.trackAction('/dashboard', 'cv_created', updatedCV.title);
    navigate('/editor');
  };

  const handleEditCV = (cv: CVData) => {
    setCurrentCV(cv);
    globalSessionService.trackAction('/dashboard', 'cv_edited', cv.title);
    navigate('/editor');
  };

  const handlePreviewCV = (cv: CVData) => {
    setCurrentCV(cv);
    globalSessionService.trackAction('/dashboard', 'cv_edited', cv.title);
    navigate('/preview');
  };

  return (
    <div className="min-h-screen bg-surface-950 p-6">
      <div className="max-w-7xl mx-auto">

        {/* -- Header -- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">My Resumes</h1>
            <p className="text-sm text-slate-400">Create and manage your professional resumes</p>
          </div>

          <div className="flex gap-3">
            {inProgressApps > 0 && (
              <Button
                variant="secondary"
                onClick={() => navigate('/applications')}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Applications ({inProgressApps})
              </Button>
            )}
            <Button onClick={() => setShowTemplateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Resume
            </Button>
          </div>
        </div>

        {/* -- Recovery Card (shown above everything if active session exists) -- */}
        {hasActiveSession && lastActiveCV && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4 border-teal-600/30">
              <div className="flex items-center gap-4">
                {/* Mini progress ring */}
                <MiniRing progress={overallProgress} size={48} />

                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-100">
                    Continue your resume
                  </h3>
                  <p className="text-sm text-slate-400">
                    {lastActiveCV.title}
                    {sessionData?.sessionTimestamps?.lastActive && (
                      <span className="ml-2 text-slate-500">
                        -- last edited {timeAgo(sessionData.sessionTimestamps.lastActive)}
                      </span>
                    )}
                  </p>
                </div>

                {/* Resume button */}
                <Button
                  size="sm"
                  onClick={() => handleEditCV(lastActiveCV)}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Resume
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* -- Pending Application Reminders -- */}
        {pendingReminders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4 border-amber-500/30">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-amber-400" />
                <div className="flex-1">
                  <p className="text-sm text-amber-300">
                    {pendingReminders.length} application{pendingReminders.length > 1 ? 's' : ''} pending for over 24 hours
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pendingReminders.map(r => r.company).join(', ')}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/applications')}
                >
                  View
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* -- Search and View Toggle -- */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search resumes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="p-2"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="p-2"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* -- CV Grid -- */}
        {filteredCVs.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`grid ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1'
            } gap-5`}
          >
            {filteredCVs.map((cv, index) => (
              <motion.div
                key={cv.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <CVCard
                  cv={cv}
                  onEdit={handleEditCV}
                  onDuplicate={duplicateCV}
                  onDelete={deleteCV}
                  onPreview={handlePreviewCV}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <Card className="text-center py-12">
            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              {searchQuery ? 'No resumes found' : 'No resumes yet'}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Create your first resume to get started'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowTemplateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Resume
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* -- Template Selection Modal -- */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Choose a Template"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-400">
            Select a template to start building your resume. You can change it later.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate.id === template.id}
                onSelect={setSelectedTemplate}
              />
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-5 border-t border-slate-700/60">
            <Button variant="ghost" onClick={() => setShowTemplateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCV}>
              Create Resume
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

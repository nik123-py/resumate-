/**
 * LandingPage.tsx
 * -----------------------------------------------
 * Public landing page. Editorial-style layout,
 * warm dark tones, teal accent. Designed to feel
 * hand-crafted rather than template-generated.
 * -----------------------------------------------
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Zap,
  Palette,
  Download,
  Star,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AuthModal } from '../components/auth/AuthModal';

/* -- Feature data -- */
const features = [
  {
    icon: <Palette className="w-5 h-5" />,
    title: 'Beautiful Templates',
    description:
      'Professionally designed templates that feel polished without being flashy.',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Real-time Preview',
    description:
      'See every change as you type. Split-pane editor with instant rendering.',
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: 'PDF Export',
    description:
      'Download high-quality PDFs that render perfectly on any device.',
  },
];

/* -- Testimonial data -- */
const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Software Engineer',
    content:
      'Resumate helped me build a clean, professional CV that actually landed interviews.',
  },
  {
    name: 'Michael Rodriguez',
    role: 'Marketing Manager',
    content:
      'The editing experience is refreshingly smooth. No clutter, no distractions.',
  },
  {
    name: 'Emily Watson',
    role: 'Designer',
    content:
      'Finally a CV tool that respects good design. Dark mode is a nice touch too.',
  },
];

/* -- Capability bullets -- */
const capabilities = [
  'Drag-and-drop section reordering',
  'AI-powered content suggestions',
  'Application tracking built in',
  'Session recovery -- never lose progress',
  'Multiple template styles',
  'One-click PDF export',
];

export function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-surface-950">

      {/* ============ HERO ============ */}
      <section className="relative px-4 pt-24 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* -- Small badge above headline -- */}
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-slate-700/60 bg-surface-900 text-sm text-slate-400">
              <FileText className="w-3.5 h-3.5 text-teal-500" />
              Free & open-source CV builder
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-100 leading-tight tracking-tight">
              Build a resume that
              <br />
              <span className="text-teal-400">gets noticed</span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              A focused, distraction-free editor with real-time preview, smart
              templates, and AI assistance. No sign-up walls, no watermarks.
            </p>

            {/* -- CTA buttons -- */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-10">
              <Button
                size="lg"
                onClick={() => setShowAuthModal(true)}
                className="px-8"
              >
                Start building
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="ghost" size="lg" className="px-8">
                View templates
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-slate-100">
              Everything you need
            </h2>
            <p className="mt-3 text-slate-400 max-w-lg mx-auto">
              Straightforward tools that help you focus on content, not
              formatting.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                viewport={{ once: true }}
              >
                <Card className="h-full">
                  {/* -- Icon container -- */}
                  <div className="w-10 h-10 bg-teal-600/15 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-teal-400">{feature.icon}</div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CAPABILITIES LIST ============ */}
      <section className="px-4 py-16 border-y border-slate-800/60">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center">
              What you get
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {capabilities.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ TEMPLATE PREVIEW ============ */}
      <section id="templates" className="px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-slate-100">
              Pick a template
            </h2>
            <p className="mt-3 text-slate-400 max-w-lg mx-auto">
              Three distinct styles to match your personality. Switch anytime.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Minimal', 'Modern', 'Creative'].map((template, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                viewport={{ once: true }}
              >
                <Card hover>
                  {/* -- Template wireframe preview -- */}
                  <div className="aspect-[3/4] bg-surface-950 rounded-lg border border-slate-700/40 overflow-hidden mb-4">
                    <div className="p-4 space-y-2 text-xs">
                      {template === 'Minimal' && (
                        <>
                          <div className="h-3 bg-slate-700 rounded w-2/3"></div>
                          <div className="h-1 bg-slate-800 rounded w-1/2"></div>
                          <div className="border-b border-slate-800 my-3"></div>
                          <div className="space-y-1">
                            <div className="h-1 bg-slate-800 rounded"></div>
                            <div className="h-1 bg-slate-800 rounded w-4/5"></div>
                          </div>
                        </>
                      )}
                      {template === 'Modern' && (
                        <>
                          <div className="flex space-x-2">
                            <div className="flex-1 space-y-1">
                              <div className="h-2 bg-slate-700 rounded"></div>
                              <div className="h-1 bg-slate-800 rounded w-3/4"></div>
                            </div>
                            <div className="w-8 h-8 bg-slate-800 rounded-full"></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="space-y-1">
                              <div className="h-1 bg-teal-600/60 rounded w-1/2"></div>
                              <div className="h-1 bg-slate-800 rounded"></div>
                            </div>
                          </div>
                        </>
                      )}
                      {template === 'Creative' && (
                        <>
                          <div className="bg-teal-700 h-6 rounded-t-lg -mx-4 -mt-4 mb-2"></div>
                          <div className="h-2 bg-slate-700 rounded w-1/2 mx-auto"></div>
                          <div className="space-y-1 mt-3">
                            <div className="h-1 bg-teal-600/60 rounded w-1/3"></div>
                            <div className="h-1 bg-slate-800 rounded"></div>
                            <div className="h-1 bg-slate-800 rounded w-4/5"></div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">
                    {template}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {template === 'Minimal' && 'Clean and focused'}
                    {template === 'Modern' && 'Structured and bold'}
                    {template === 'Creative' && 'Standout and expressive'}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="px-4 py-20 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-slate-100">
              What people say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                viewport={{ once: true }}
              >
                <Card className="h-full">
                  {/* -- Star rating -- */}
                  <div className="flex items-center space-x-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                    "{item.content}"
                  </p>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">{item.role}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BOTTOM CTA ============ */}
      <section className="px-4 py-20 border-t border-slate-800/60">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-slate-100 mb-4">
              Ready to get started?
            </h2>
            <p className="text-slate-400 mb-8">
              It takes under a minute to set up. No credit card required.
            </p>
            <Button
              size="lg"
              className="px-10"
              onClick={() => setShowAuthModal(true)}
            >
              Create your resume
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* -- Footer -- */}
      <footer className="px-4 py-8 border-t border-slate-800/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <FileText className="w-4 h-4" />
            Resumate
          </div>
          <p className="text-xs text-slate-600">
            Built with care. Not by a template.
          </p>
        </div>
      </footer>

      {/* -- Auth modal -- */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

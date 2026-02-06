/**
 * seed.ts
 * -----------------------------------------------
 * Seed script for development. Creates a test
 * user and sample data.
 * Usage: npm run seed
 * -----------------------------------------------
 */

import './config'; // Load env
import { upsertUser, upsertCV, createApplication, createReminder } from './db';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';

console.info('[Seed] Starting...');

// Create test user
const userId = 'test-user-1';
upsertUser(userId, 'Test User', 'test@resumate.local', config.authToken);
console.info('[Seed] Created user:', userId);

// Create sample CV
const cvId = 'cv-sample-1';
const cvData = {
  id: cvId,
  title: 'Software Engineer Resume',
  templateId: 'modern',
  sections: [
    { id: 's1', type: 'contact', title: 'Contact Info', order: 0, visible: true, data: { fullName: 'John Doe', email: 'john@example.com', phone: '+1234567890', location: 'San Francisco, CA' } },
    { id: 's2', type: 'summary', title: 'Summary', order: 1, visible: true, data: { content: 'Passionate software engineer with 5 years of experience.' } },
    { id: 's3', type: 'experience', title: 'Experience', order: 2, visible: true, data: { items: [{ id: 'e1', company: 'Tech Corp', position: 'Senior Developer', startDate: '2021-01', endDate: '', current: true, description: 'Leading frontend team.' }] } },
    { id: 's4', type: 'education', title: 'Education', order: 3, visible: true, data: { items: [{ id: 'ed1', institution: 'MIT', degree: 'BS', field: 'Computer Science', startDate: '2015-09', endDate: '2019-05' }] } },
    { id: 's5', type: 'skills', title: 'Skills', order: 4, visible: true, data: { items: ['TypeScript', 'React', 'Node.js', 'Python', 'AWS'] } },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
upsertCV(cvId, userId, cvData.title, JSON.stringify(cvData));
console.info('[Seed] Created CV:', cvId);

// Create sample application
const appId = uuidv4();
const appData = {
  id: appId,
  jobTitle: 'Frontend Engineer',
  company: 'Google',
  sourceUrl: 'https://careers.google.com/jobs/results/',
  status: 'in_progress',
  lastEditedAt: Date.now(),
  notes: 'Need to tailor summary for this role',
};
const remindAt = Date.now() + 24 * 60 * 60 * 1000;
createApplication(appId, userId, cvId, JSON.stringify(appData), 'in_progress', remindAt);
createReminder(uuidv4(), appId, userId, remindAt);
console.info('[Seed] Created application:', appId);

console.info('[Seed] Done! ✓');

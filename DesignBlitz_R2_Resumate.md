# DesignBlitz Round 2 -- Resumate: Session Intelligence & Recovery

> **Team:** Resumate | **Seed Phrase:** `spine-hangar` | **Date:** February 2026

---

## Table of Contents

1. [Ecosystem & Competitor Analysis](#1-ecosystem--competitor-analysis)
2. [Problem Framing](#2-problem-framing)
3. [Product Requirement Document (PRD)](#3-product-requirement-document-prd)
4. [High-Level Architecture Diagram](#4-high-level-architecture-diagram)
5. [Data Flow Diagram](#5-data-flow-diagram)
6. [Flowchart Diagrams](#6-flowchart-diagrams)
7. [Medium-Fidelity Wireframes](#7-medium-fidelity-wireframes)

---

## 1. Ecosystem & Competitor Analysis

### 1.1 Industry Context

Resume building sits at the intersection of **content creation**, **high-stakes document preparation**, and **job-application workflows**. Users typically spend 30-90 minutes per resume session, often across multiple sittings. The workflow is inherently fragmented:

- Users switch between the resume builder and job postings to tailor content
- They research companies, role requirements, and keyword optimization mid-session
- They consult AI tools, reference past resumes, and iterate on phrasing
- Battery dies, Wi-Fi drops, browsers crash, devices switch

Despite this, **no major resume builder treats interruption as a first-class design concern.**

### 1.2 Competitor Breakdown

| Product | Autosave | Recovery Screen | Progress Indicator | Field-Level Resume | Cross-Device Sync | AI Re-entry Nudge | Application Context |
|---------|----------|-----------------|--------------------|--------------------|-------------------|--------------------|---------------------|
| **Canva Resume** | Yes (cloud) | None -- drops to dashboard | None | No | Yes (account) | No | No |
| **Zety** | Partial (per step) | None -- restarts wizard step | Step counter (1-6) | No | No (session-based) | No | No |
| **Resume.io** | Yes (cloud) | None -- loads last state | Sidebar section list | No | Yes (account) | No | No |
| **Novoresume** | Yes (cloud) | None | Section checklist | No | Yes (account) | No | No |
| **Indeed Resume** | Yes | None | None | No | Yes (account) | No | Yes (job linking) |
| **LinkedIn Resume** | Auto-populated | N/A | N/A | N/A | N/A | N/A | Native |
| **Enhancv** | Yes (cloud) | None | Content score | No | Yes | No | No |
| **Google Docs** | Yes (real-time) | "Last edit was X ago" | None (freeform) | No | Yes | No | No |
| **Figma** | Yes (real-time) | Version history | None | Component-level | Yes | No | No |
| **Notion** | Yes | "Last edited" badge | None | Block-level | Yes | No | No |
| **Resumate (Ours)** | Yes (10s debounced + backend) | Full Recovery Modal | Segmented ring + per-section bars | Yes (field-level cursor) | Yes (backend sync) | Yes (Gemini AI) | Yes (Application Spine) |

### 1.3 Critical Gaps Identified

**Gap 1: No Orientation on Return**
Every competitor loads the last state silently. If a user returns after 3 days, they see the same editor screen with no context about what was completed, what remains, or what they were actively working on. The cognitive burden of re-orientation falls entirely on the user.

**Gap 2: No Progress Communication**
Only Zety (step counter) and Enhancv (content score) show any progress. None show per-section completion. None communicate "you're 73% done, your Experience section needs work." Users have no compass.

**Gap 3: No Interruption Awareness**
No product distinguishes between a user who closed a tab, lost internet, went idle, or switched devices. All interruptions are treated identically (or ignored). There's no acknowledgment of *how* the user left and no tailored response.

**Gap 4: No Application-Resume Coupling**
Users build resumes *for specific jobs* but no competitor (except Indeed) connects the resume to the job application. Context switching between builder and job board destroys focus and loses state.

**Gap 5: No AI-Powered Re-entry**
No product uses AI to provide a personalized nudge when the user returns. "Your Experience section is your weakest -- try adding metrics to your most recent role" is infinitely more useful than a blank editor.

### 1.4 Competitive Positioning

```
                    High Re-entry Intelligence
                            ^
                            |
                   Resumate [***]
                            |
                            |
    Simple ----------+------+------+---------- Complex
    (Notes)          |      |      |           (Full Suite)
                     |      |      |
              Google |  Enhancv   | Figma
              Docs   |      |    Notion
                     |      |      |
                   Zety   Resume.io
                     |      |
                   Canva   Indeed
                            |
                            v
                    Low Re-entry Intelligence
```

Resumate occupies a unique position: **high re-entry intelligence** with **focused complexity** (resume-specific, not a general tool).

---

## 2. Problem Framing

### 2.1 The Interruption Reality

Research consistently shows that **task interruptions are the norm, not the exception**:

- **Gloria Mark (UC Irvine, "Attention Span" 2023):** The average attention span on a single screen has dropped from 2.5 minutes (2004) to 47 seconds (2023). Workers are interrupted or self-interrupt every 3-5 minutes.
- **Microsoft Research (2024):** After an interruption, it takes an average of **23 minutes and 15 seconds** to fully return to the original task. For complex tasks (like resume writing), this rises to **25+ minutes**.
- **Iqbal & Horvitz (CHI 2007):** Users who are interrupted mid-task experience **41% more errors** and **significantly higher stress** than those who complete tasks in a single session.
- **Baethge & Rigotti (2013):** Task interruptions are positively correlated with **psychosomatic complaints and emotional exhaustion**, particularly when the interrupted task was high-effort and personally important.

Resume building checks every box for high-interruption-vulnerability:
- **High effort:** Requires active recall, self-reflection, careful phrasing
- **High stakes:** Directly impacts career outcomes
- **Long duration:** 30-90 minutes, rarely completed in one sitting
- **Multi-source dependency:** Requires referencing job descriptions, past resumes, company info
- **Emotionally taxing:** Job searching is inherently stressful

### 2.2 The Core User Problem

> *"I spent 40 minutes tailoring my resume for a specific job. My laptop died. When I came back, I opened the builder and saw... my resume. But I couldn't remember which section I was editing, whether I'd saved my changes to the Experience bullet points, or which job posting I was tailoring for. I ended up re-reading the entire resume before I felt confident enough to continue."*

This represents **re-entry friction** -- the cognitive overhead between "I open the app" and "I'm productively working again." Current products reduce this to zero only when the user never left, or left for a few seconds.

### 2.3 The Four Dimensions of Re-entry Friction

| Dimension | Question the User Asks | Current Products Answer? |
|-----------|------------------------|--------------------------|
| **Temporal** | "How long was I gone? Did anything change?" | Partially (some show "last edited") |
| **Positional** | "Where exactly was I? Which field? Which section?" | No |
| **Progress** | "How much is done? What's left? Am I close to finished?" | Rarely (step counters at best) |
| **Contextual** | "Why was I editing this? What job was this for? What was my strategy?" | Never |

**Resumate addresses all four dimensions.**

### 2.4 Target User Personas

**Persona 1: The Fragmented Job Seeker (Primary)**
- Age 22-35, applying to 10-30 jobs
- Uses phone on commute, laptop at home, occasionally a library computer
- Sessions are 15-45 minutes, interrupted by life (notifications, kids, commute stops)
- Needs: Instant re-orientation, application-resume pairing, progress confidence

**Persona 2: The Perfectionist Updater**
- Age 28-45, employed, updating resume opportunistically
- Works on resume in stolen moments (lunch break, late night)
- Leaves mid-sentence, returns days later
- Needs: Field-level draft preservation, AI nudge to complete weak sections

**Persona 3: The Multi-Device Juggler**
- Any age, switches between phone/tablet/laptop
- Starts on one device, finishes on another
- Needs: Cross-device session sync, device-switch detection, seamless state transfer

---

## 3. Product Requirement Document (PRD)

### 3.1 Product Overview

**Product Name:** Resumate -- Session Intelligence & Recovery Layer
**Version:** 1.0 (Hackathon MVP)
**Workflow:** Resume creation, editing, and job application tracking

### 3.2 User Context & Interruption Scenarios

| # | Scenario | Trigger | Severity | Our Response |
|---|----------|---------|----------|--------------|
| S1 | Tab accidentally closed | `beforeunload` event | High | Instant save, Recovery Screen on return |
| S2 | Browser/app crash | No event (last autosave) | High | Recover from last 10s checkpoint |
| S3 | Internet drops mid-edit | `offline` event | Medium | Amber toast, local persistence, sync on reconnect |
| S4 | User goes idle (5+ min) | Activity timeout | Low | Gentle toast "Session saved. You can safely close." |
| S5 | Device switch | `deviceId` mismatch | Medium | "Continuing from another device" badge, merge latest |
| S6 | Voluntary exit | User navigates away | Low | Background save, Welcome Back on return |
| S7 | Days-long absence | `lastActive` > 48h | High | Full Recovery Screen + AI suggestion + progress ring |

### 3.3 Design Goals

| Goal | Description | Metric |
|------|-------------|--------|
| **G1: Zero-confusion return** | User understands their state within 3 seconds of returning | Time-to-first-edit < 10s (vs. current ~60s) |
| **G2: One-click resumption** | Primary action is always "continue where I left off" | 90%+ click-through on Resume button |
| **G3: Visible progress** | User always knows how complete their resume is | Completion ring visible on every editor screen |
| **G4: Context preservation** | Job application context travels with the resume | Application Spine visible in editor |
| **G5: Graceful degradation** | Works offline, works without backend, works across devices | Zero data loss in any interruption scenario |

### 3.4 Design Constraints

- **No new npm packages** -- use existing dependencies (React, Framer Motion, Tailwind)
- **Offline-first** -- localStorage is always the source of truth; backend is enhancement
- **< 200KB session payload** -- sessions must not bloat storage
- **< 100ms save latency** -- autosave must be imperceptible
- **Accessibility** -- Recovery modal must be keyboard-navigable, ARIA-compliant
- **Debug-friendly** -- Every save, load, and sync operation logged to console

### 3.5 Proposed Solution

#### Layer 1: Session Intelligence Engine

A pure-TypeScript singleton (`sessionService.ts`) that operates independently of React. Captures:

- **Active section** and **last cursor field** (field-level granularity)
- **Scroll position** within the editor
- **Unsaved draft text** per field (keystrokes not yet committed to CV data)
- **AI conversation state** (pending prompt, message history)
- **Section completion map** (0-100 per section, calculated by `completionCalculator.ts`)
- **Append-only action log** (oplog of meaningful user actions for timeline)
- **Device ID** (for cross-device detection)
- **Interruption type** classification

Persistence strategy:
- Debounced autosave every **10 seconds**
- Immediate save on `beforeunload`, `visibilitychange`, `offline`
- Backend sync (fire-and-forget) when server is available

#### Layer 2: Recovery & Re-entry UI

**Recovery Screen** (`RecoveryScreen.tsx`): Full-screen modal overlay when returning user detected.
Contains:
- "Welcome back" headline with time-away duration
- Segmented circular progress ring (color-coded: green > 80%, amber 30-80%, gray < 30%)
- Per-section status list with mini progress bars
- Last-edited field highlight
- AI-generated nudge ("Your Skills section needs more specificity -- try adding tools and frameworks")
- Two CTAs: "Resume Where I Left Off" (primary) and "Start Fresh Review" (secondary)

**Welcome Back Guide** (`WelcomeBackGuide.tsx`): App-wide re-entry overlay (independent of any specific CV).
Contains:
- Natural-language briefing of recent activity
- Last page indicator with navigation shortcut
- Recent action timeline (last 5 meaningful actions)
- Contextual suggestion based on last route

**Progress Sidebar** (`ProgressSidebar.tsx`): Always-visible in editor.
Contains:
- Overall circular progress
- Section-by-section progress rows (clickable to scroll)
- Session timeline (last 5 action log entries)
- AI suggestions badge

**Interruption Toast** (`InterruptionToast.tsx`): Non-blocking notifications.
- Offline: Amber persistent toast
- Idle: Gentle auto-dismissing toast
- Reconnect: Green confirmation toast

#### Layer 3: Application Context Spine

**Embedded Browser** (`EmbeddedBrowser.tsx`): In-app job application workspace.
- Lists tracked applications with status badges
- Provides clipboard-copy fields for quick form filling
- Tracks last-visited URL and focused field per application
- 24-hour reminder scheduling for stale applications

#### Layer 4: AI Credibility Scoring

**Server-proxied Gemini integration** (`/api/score`):
- Accepts resume text + job description
- Returns credibility score (0-100), explanation, and 3 improvement highlights
- Cached for 1 hour per resume+JD combination
- Rate-limited to prevent abuse (10 requests/minute)

### 3.6 User Flows

**Flow 1: Normal Editing Session**
```
User opens app --> Dashboard --> Selects CV --> Editor loads
  --> SessionService.init(cvId) --> Fresh session created
  --> User edits sections --> setPatch() on every focus/change
  --> Autosave fires every 10s --> localStorage + backend sync
  --> User finishes --> Navigates away --> detach() saves final state
```

**Flow 2: Return After Interruption**
```
User returns to app --> App mounts --> GlobalSessionService checks lastActiveAt
  --> If away > 2 min: Show WelcomeBackGuide (app-level)
  --> User navigates to editor --> SessionContext loads session
  --> If session exists with activity: Show RecoveryScreen (CV-level)
  --> User clicks "Resume" --> Scroll to section, focus field, restore drafts
  --> Toast: "Restored your draft -- last saved 5m ago"
```

**Flow 3: Offline Interruption**
```
Internet drops --> navigator.offline event fires
  --> SessionService saves immediately to localStorage
  --> InterruptionToast shows amber "You're offline" message
  --> User continues editing (all local) --> Saves continue to localStorage
  --> Internet returns --> navigator.online event fires
  --> Toast dismisses --> Backend sync fires (merge latest)
```

**Flow 4: Device Switch**
```
User saves on Device A (deviceId: "abc") --> Backend stores session
  --> User opens app on Device B (deviceId: "xyz")
  --> SessionService.init() loads local session (if any)
  --> tryBackendSync() finds backend session with newer timestamp
  --> deviceId mismatch detected --> interruptionType = "device_switch"
  --> Session merged from backend --> RecoveryScreen shows "Continuing from another device"
```

### 3.7 Success Indicators

| Indicator | Baseline (No Recovery) | Target (With Resumate) | Measurement |
|-----------|------------------------|------------------------|-------------|
| Time-to-first-edit on return | ~60 seconds | < 10 seconds | Timer from app load to first keystroke |
| Task abandonment after interruption | ~35% | < 10% | Sessions started but never completed |
| Re-entry confusion (user scrolls >3 screens before editing) | ~70% of returns | < 15% | Scroll depth before first edit |
| Session completion rate | ~45% | > 75% | CVs reaching >80% completion |
| Cross-device continuation rate | ~5% (manual) | > 40% | Sessions continued on different deviceId |
| User-reported confidence ("I know where I am") | 3.2/5 | 4.5+/5 | Post-session survey |

---

## 4. High-Level Architecture Diagram

```
+------------------------------------------------------------------+
|                        CLIENT (Browser)                          |
|  +---------------------------+  +-----------------------------+  |
|  |     React Application     |  |    Service Layer (Pure TS)  |  |
|  |                           |  |                             |  |
|  |  +---------------------+  |  |  +----------------------+  |  |
|  |  |    AuthProvider     |  |  |  |  sessionService.ts   |  |  |
|  |  +---------------------+  |  |  |  (Singleton)         |  |  |
|  |  |    CVProvider       |  |  |  |  - State capture     |  |  |
|  |  +---------------------+  |  |  |  - Autosave (10s)    |  |  |
|  |  |  SessionProvider    |<-+--+->|  - Idle detection     |  |  |
|  |  +---------------------+  |  |  |  - Interruption ID   |  |  |
|  |           |               |  |  +----------------------+  |  |
|  |           v               |  |                             |  |
|  |  +---------------------+  |  |  +----------------------+  |  |
|  |  |  Pages & Components |  |  |  | globalSessionService |  |  |
|  |  |                     |  |  |  |  - Route tracking    |  |  |
|  |  |  - Dashboard        |  |  |  |  - Activity log      |  |  |
|  |  |  - CVEditor         |  |  |  |  - Welcome briefing  |  |  |
|  |  |  - PreviewPage      |  |  |  +----------------------+  |  |
|  |  |  - AIAssistantPage  |  |  |                             |  |
|  |  |  - EmbeddedBrowser  |  |  |  +----------------------+  |  |
|  |  +---------------------+  |  |  | applicationTracker   |  |  |
|  |           |               |  |  |  - CRUD applications  |  |  |
|  |           v               |  |  |  - 24h reminders      |  |  |
|  |  +---------------------+  |  |  +----------------------+  |  |
|  |  | Recovery UI Layer   |  |  |                             |  |
|  |  |  - RecoveryScreen   |  |  |  +----------------------+  |  |
|  |  |  - WelcomeBackGuide |  |  |  |    apiClient.ts      |  |  |
|  |  |  - ProgressSidebar  |  |  |  |  - Auto-detect       |  |  |
|  |  |  - InterruptionToast|  |  |  |  - Fallback to local |  |  |
|  |  +---------------------+  |  |  |  - Sync merge logic  |  |  |
|  +---------------------------+  |  +----------------------+  |  |
|                                  +-----------------------------+  |
|                                              |                    |
|                        localStorage          |  HTTP (REST)       |
|                        (Source of Truth)      |                    |
+---------------------------------------------|--------------------+
                                               |
                                               v
+------------------------------------------------------------------+
|                     BACKEND SERVER (Express)                      |
|                     Port 3001 | Node.js + TypeScript              |
|                                                                   |
|  +--------------------+  +------------------+  +---------------+  |
|  |    Middleware       |  |     Routes       |  |   Services    |  |
|  |                    |  |                  |  |               |  |
|  |  - auth.ts         |  |  /api/health     |  | geminiService |  |
|  |    (token-based)   |  |  /api/sessions/* |  |  - score()    |  |
|  |  - rateLimit.ts    |  |  /api/cvs/*      |  |  - analyze()  |  |
|  |    (10 req/min)    |  |  /api/apps/*     |  |  - nudge()    |  |
|  +--------------------+  |  /api/score/*    |  +---------------+  |
|                          |  /api/reminders/* |                    |
|                          +------------------+  +---------------+  |
|                                   |            | reminderSched |  |
|                                   v            |  - cron job   |  |
|                          +------------------+  |  - 60s check  |  |
|                          |    SQLite DB     |  +---------------+  |
|                          |   (WAL mode)     |                     |
|                          |                  |                     |
|                          |  - users         |                     |
|                          |  - cvs           |                     |
|                          |  - sessions      |                     |
|                          |  - applications  |                     |
|                          |  - reminders     |                     |
|                          |  - score_cache   |                     |
|                          +------------------+                     |
+------------------------------------------------------------------+
                                               |
                                               v
+------------------------------------------------------------------+
|                   EXTERNAL SERVICES                               |
|                                                                   |
|  +---------------------------+                                    |
|  |  Google Gemini API        |                                    |
|  |  (generativelanguage.     |                                    |
|  |   googleapis.com/v1beta)  |                                    |
|  |                           |                                    |
|  |  - Resume scoring         |                                    |
|  |  - Improvement analysis   |                                    |
|  |  - Contextual nudges      |                                    |
|  |  - AI chat suggestions    |                                    |
|  +---------------------------+                                    |
+------------------------------------------------------------------+
```

### Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Offline-first** | localStorage is always written first; backend sync is fire-and-forget |
| **Graceful degradation** | If backend is down, app works fully via localStorage |
| **Single source of truth** | localStorage on client; backend is a durable replica |
| **Append-only oplog** | Action log enables timeline reconstruction without diffing snapshots |
| **Separation of concerns** | Services are pure TS (no React); Context bridges to UI |

---

## 5. Data Flow Diagram

### 5.1 Session Persistence Flow

```
+-------------+     setPatch()      +------------------+
|   User      | ------------------> | SessionService   |
|   Action    |   (field focus,     |   (Singleton)    |
|  (keypress, |    section expand,  |                  |
|   click,    |    scroll, draft)   | +- state -----+  |
|   scroll)   |                     | | cvId         |  |
+-------------+                     | | activeSection|  |
                                    | | lastCursor   |  |
                                    | | scrollPos    |  |
                                    | | draftText{}  |  |
                                    | | completion{} |  |
                                    | | actionLog[]  |  |
                                    | | deviceId     |  |
                                    | +--------------+  |
                                    +-----|-----|-------+
                                          |     |
                              +-----------+     +----------+
                              |  (10s debounce)            |  (immediate)
                              v                            v
                    +-------------------+        +-----------------+
                    |   localStorage    |        |  Backend Sync   |
                    | resumate_session_ |        |  POST /api/     |
                    | {cvId}            |        |  sessions/{cvId}|
                    +-------------------+        |  /save          |
                              |                  +-----------------+
                              |                           |
                              v                           v
                    +-------------------+        +-----------------+
                    |  On Next Visit:   |        |   SQLite DB     |
                    |  SessionService   |        |   sessions      |
                    |  .init(cvId)      |        |   table         |
                    |                   |        +-----------------+
                    |  Compare local    |                |
                    |  vs backend ts    |<---------------+
                    |  Use newer        |   tryBackendSync()
                    +-------------------+
```

### 5.2 Interruption Detection & Response Flow

```
+------------------+     +-------------------+     +-------------------+
|  Browser Events  |     |  SessionService   |     |   UI Response     |
+------------------+     +-------------------+     +-------------------+
|                  |     |                   |     |                   |
| beforeunload ----|---->| type="tab_closed" |---->| (no UI, instant   |
|                  |     | saveNow()         |     |  save only)       |
|                  |     |                   |     |                   |
| visibilitychange-|---->| saveNow()         |---->| (silent save)     |
| (hidden)         |     |                   |     |                   |
|                  |     |                   |     |                   |
| offline ---------|---->| type="connectivity"|---->| Amber Toast:      |
|                  |     | _lost"            |     | "You're offline.  |
|                  |     | saveNow()         |     |  Progress saved." |
|                  |     |                   |     |                   |
| online ----------|---->| clear interruption|---->| Green Toast:      |
|                  |     | backend sync      |     | "Back online.     |
|                  |     |                   |     |  Syncing..."      |
|                  |     |                   |     |                   |
| (no activity     |---->| type="idle_timeout"|-->| Gentle Toast:     |
|  for 5 min)      |     | saveNow()         |     | "Session saved.   |
|                  |     |                   |     |  Close safely."   |
|                  |     |                   |     |                   |
| (deviceId        |---->| type="device_     |---->| RecoveryScreen:   |
|  mismatch)       |     | switch"           |     | "Continuing from  |
|                  |     | merge sessions    |     |  another device"  |
+------------------+     +-------------------+     +-------------------+
```

### 5.3 AI Scoring Data Flow

```
+------------+     +-------------+     +----------------+     +-------------+
|  Frontend  |     |  apiClient  |     | Backend Server |     | Gemini API  |
|  (Editor)  |     |   .ts       |     |  /api/score    |     |  (Google)   |
+-----+------+     +------+------+     +-------+--------+     +------+------+
      |                    |                    |                      |
      |  User clicks       |                    |                      |
      |  "Score Resume"    |                    |                      |
      +------------------->|                    |                      |
      |                    |  POST /api/score   |                      |
      |                    |  {cvText, jobDesc} |                      |
      |                    +------------------->|                      |
      |                    |                    |                      |
      |                    |                    |  Check score_cache   |
      |                    |                    |  (MD5 hash lookup)   |
      |                    |                    |                      |
      |                    |                    |  [Cache MISS]        |
      |                    |                    |                      |
      |                    |                    |  POST /v1beta/       |
      |                    |                    |  models/gemini-2.0   |
      |                    |                    |  -flash:generate     |
      |                    |                    +--------------------->|
      |                    |                    |                      |
      |                    |                    |  {score, explanation |
      |                    |                    |   highlights[]}      |
      |                    |                    |<---------------------+
      |                    |                    |                      |
      |                    |                    |  Cache result        |
      |                    |                    |  (1 hour TTL)        |
      |                    |                    |                      |
      |                    |  {score: 72,       |                      |
      |                    |   explanation,     |                      |
      |                    |   highlights[3]}   |                      |
      |                    |<-------------------+                      |
      |                    |                    |                      |
      |  Display score     |                    |                      |
      |  card + tips       |                    |                      |
      |<-------------------+                    |                      |
      |                    |                    |                      |
```

### 5.4 Reminder Scheduling Flow

```
+-------------+     +--------------+     +----------------+     +-----------+
|   User      |     | Application  |     |    Backend     |     | Scheduler |
|   Action    |     |  Tracker     |     |   /api/apps    |     |  (Cron)   |
+------+------+     +------+-------+     +-------+--------+     +-----+-----+
       |                   |                      |                     |
       | Create app        |                      |                     |
       | (in_progress)     |                      |                     |
       +------------------>|                      |                     |
       |                   |                      |                     |
       |                   | POST /api/apps       |                     |
       |                   | {status:"in_progress"|                     |
       |                   |  company:"Google"}   |                     |
       |                   +--------------------->|                     |
       |                   |                      |                     |
       |                   |                      | Create reminder     |
       |                   |                      | remindAt = now+24h  |
       |                   |                      +-------------------->|
       |                   |                      |                     |
       |                   |   {ok, id,           |                     |
       |                   |    remindAt}         |                     |
       |                   |<---------------------+                     |
       |                   |                      |                     |
       |                   |                      |     ... 24 hours    |
       |                   |                      |     later ...       |
       |                   |                      |                     |
       |                   |                      |  Cron fires (60s)   |
       |                   |                      |<--------------------+
       |                   |                      |                     |
       |  User returns     |                      |  Reminder is due    |
       |  to app           |                      |  (not auto-sent,    |
       |                   |                      |   waits for client) |
       |                   |                      |                     |
       |                   | GET /api/reminders   |                     |
       |                   | /due                 |                     |
       |                   +--------------------->|                     |
       |                   |                      |                     |
       |                   |  {dueReminders: [{   |                     |
       |                   |    app: "Google",    |                     |
       |                   |    remindAt: ...}]}  |                     |
       |                   |<---------------------+                     |
       |                   |                      |                     |
       | Dashboard shows   |                      |                     |
       | "Pending Apps"    |                      |                     |
       | nudge widget      |                      |                     |
       |<------------------+                      |                     |
       |                   |                      |                     |
```

---

## 6. Flowchart Diagrams

### 6.1 App Entry & Re-entry Decision Flowchart

```
                        +-------------------+
                        |   User Opens App  |
                        +---------+---------+
                                  |
                                  v
                        +-------------------+
                        | GlobalSession     |
                        | .isReturningUser()|
                        +---------+---------+
                                  |
                        +---------+---------+
                        | Away > 2 minutes  |
                        | AND has activity? |
                        +---------+---------+
                           |             |
                          YES            NO
                           |             |
                           v             v
                  +-----------------+  +------------------+
                  | Show Welcome    |  | Normal app load  |
                  | Back Guide      |  | (no overlay)     |
                  | (app-level)     |  +------------------+
                  +---------+-------+
                            |
                  +---------+---------+
                  | User chooses:     |
                  +---------+---------+
                     |             |
              "Go to last     "Go to
               page"          Dashboard"
                     |             |
                     v             v
              +-------------+ +-----------+
              | Navigate to | | Navigate  |
              | lastRoute   | | /dashboard|
              +------+------+ +-----+-----+
                     |               |
                     +-------+-------+
                             |
                             v
                    +------------------+
                    | Is user on       |
                    | /editor with     |
                    | active CV?       |
                    +--------+---------+
                        |          |
                       YES         NO
                        |          |
                        v          v
              +-------------------+  (Normal usage)
              | SessionContext    |
              | loads session     |
              | for current CV   |
              +--------+----------+
                       |
              +--------+----------+
              | Session exists    |
              | AND away > 2 min  |
              | AND has activity? |
              +--------+----------+
                  |          |
                 YES         NO
                  |          |
                  v          v
         +----------------+  (Editor loads
         | Show Recovery  |   normally)
         | Screen (modal) |
         +-------+--------+
                  |
         +-------+--------+
         | User chooses:   |
         +-------+--------+
            |           |
     "Resume Where  "Start Fresh
      I Left Off"    Review"
            |           |
            v           v
   +-----------------+ +------------------+
   | resumeSession() | | Dismiss modal    |
   | - Scroll to     | | - Editor at top  |
   |   section       | | - Sidebar open   |
   | - Focus field   | +------------------+
   | - Restore draft |
   | - Show tooltip  |
   +-----------------+
```

### 6.2 Session Save Decision Flowchart

```
                    +---------------------+
                    |   User performs      |
                    |   an action          |
                    +----------+----------+
                               |
                               v
                    +---------------------+
                    | sessionService      |
                    | .setPatch(data)     |
                    +----------+----------+
                               |
                    +----------+----------+
                    | Merge into state    |
                    | Update lastActive   |
                    | Reset idle timer    |
                    +----------+----------+
                               |
                    +----------+----------+
                    | Schedule autosave   |
                    | (reset 10s timer)   |
                    +----------+----------+
                               |
                  +------------+-------------+
                  |                           |
           Timer fires                 Interruption
           (10 seconds)                event fires
                  |                           |
                  v                           v
         +----------------+        +-------------------+
         | saveNow()      |        | Classify type:    |
         | reason:        |        | - tab_closed      |
         | "autosave"     |        | - visibility_hide |
         +-------+--------+        | - offline         |
                 |                 | - idle_timeout    |
                 |                 +--------+----------+
                 |                          |
                 +------------+-------------+
                              |
                              v
                    +-------------------+
                    | Update total      |
                    | editing time      |
                    | (if active < 30s) |
                    +--------+----------+
                             |
                    +--------+----------+
                    | Write to          |
                    | localStorage      |
                    | (instant, sync)   |
                    +--------+----------+
                             |
                    +--------+----------+
                    | Backend available?|
                    +--------+----------+
                        |          |
                       YES         NO
                        |          |
                        v          v
              +-------------------+  (Done -
              | POST /api/        |   local
              | sessions/{cvId}   |   only)
              | /save             |
              | (fire & forget)   |
              +-------------------+
```

### 6.3 Cross-Device Sync Flowchart

```
              +-------------------------+
              | SessionService.init()   |
              | called with cvId        |
              +------------+------------+
                           |
                           v
              +-------------------------+
              | Load from localStorage  |
              | key: resumate_session_  |
              | {cvId}                  |
              +------------+------------+
                           |
                +----------+----------+
                | Local session found? |
                +----------+----------+
                   |              |
                  YES             NO
                   |              |
                   v              v
          +----------------+  +------------------+
          | Check deviceId |  | Create fresh     |
          | match          |  | session          |
          +-------+--------+  +--------+---------+
                  |                     |
          +-------+--------+           |
          | deviceId same? |           |
          +-------+--------+           |
             |          |              |
            YES         NO             |
             |          |              |
             |          v              |
             |  +------------------+   |
             |  | Set interruption |   |
             |  | = device_switch  |   |
             |  +--------+---------+   |
             |           |             |
             +-----------+-------------+
                         |
                         v
              +---------------------+
              | Is backend          |
              | available?          |
              +----------+----------+
                  |             |
                 YES            NO
                  |             |
                  v             v
          +------------------+  (Use local
          | GET /api/        |   session
          | sessions/{cvId}  |   as-is)
          +--------+---------+
                   |
          +--------+---------+
          | Backend has       |
          | session?          |
          +--------+---------+
              |          |
             YES         NO
              |          |
              v          v
     +------------------+  (Use local)
     | Compare           |
     | lastActive        |
     | timestamps        |
     +--------+----------+
         |           |
    Backend       Local
    is newer      is newer
         |           |
         v           v
  +-------------+ +-------------+
  | Use backend | | Use local   |
  | session     | | session     |
  | Overwrite   | | (already    |
  | localStorage| |  loaded)    |
  +-------------+ +-------------+
```

### 6.4 Resume Credibility Scoring Flowchart

```
              +-------------------------+
              | User requests score     |
              | (clicks "Score Resume") |
              +------------+------------+
                           |
                           v
              +-------------------------+
              | Extract CV text from    |
              | current CV sections     |
              +------------+------------+
                           |
                           v
              +-------------------------+
              | Backend available?      |
              +------------+------------+
                  |              |
                 YES             NO
                  |              |
                  v              v
         +-----------------+ +-------------------+
         | POST /api/score | | Use client-side   |
         | {cvText,        | | heuristic:        |
         |  jobDescription}| | completionWeight  |
         +--------+--------+ | + keyword match   |
                  |           +--------+----------+
                  v                    |
         +-----------------+           |
         | Check           |           |
         | score_cache     |           |
         | (MD5 hash)      |           |
         +--------+--------+           |
            |          |               |
         HIT (< 1h)  MISS             |
            |          |               |
            v          v               |
      (Return    +------------------+  |
       cached)   | Call Gemini API  |  |
                 | with structured  |  |
                 | prompt           |  |
                 +--------+---------+  |
                          |            |
                          v            |
                 +------------------+  |
                 | Parse JSON       |  |
                 | response:        |  |
                 | {score,          |  |
                 |  explanation,    |  |
                 |  highlights[]}   |  |
                 +--------+---------+  |
                          |            |
                          v            |
                 +------------------+  |
                 | Cache in         |  |
                 | score_cache      |  |
                 | table            |  |
                 +--------+---------+  |
                          |            |
                          +------+-----+
                                 |
                                 v
                 +----------------------------+
                 | Display to user:           |
                 | - Score badge (0-100)      |
                 | - Color coding             |
                 |   (red/amber/green)        |
                 | - Explanation paragraph    |
                 | - 3 improvement highlights |
                 | - "Improve with AI" CTA    |
                 +----------------------------+
```

---

## 7. Medium-Fidelity Wireframes

### 7.1 Recovery Screen (Returning User Modal)

```
+------------------------------------------------------------------+
|  [Backdrop: Blurred editor behind dark overlay]                   |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                                                            |  |
|  |   Welcome back! You were away for 2 hours.                 |  |
|  |                                                            |  |
|  |          +------------------+                              |  |
|  |         /   72% Complete    \                              |  |
|  |        |   +------------+   |                              |  |
|  |        |   |            |   |      Section Progress:       |  |
|  |        |   |    72%     |   |                              |  |
|  |        |   |            |   |      [====] Contact    100%  |  |
|  |        |   +------------+   |      [===.] Summary     75%  |  |
|  |         \                  /       [==...] Experience  50%  |  |
|  |          +----------------+        [====] Education   100%  |  |
|  |                                    [=....] Skills      30%  |  |
|  |     Colors:                                                |  |
|  |     Green = Contact, Education                             |  |
|  |     Amber = Summary, Experience                            |  |
|  |     Gray  = Skills                                         |  |
|  |                                                            |  |
|  |  --------------------------------------------------------  |  |
|  |                                                            |  |
|  |  [*] Last edited: Experience > Job Description             |  |
|  |                                                            |  |
|  |  [AI] "Your Skills section could be stronger. Try adding   |  |
|  |       specific frameworks and tools you've used."          |  |
|  |                                                            |  |
|  |  --------------------------------------------------------  |  |
|  |                                                            |  |
|  |  [ Resume Where I Left Off ]    [ Start Fresh Review ]     |  |
|  |     (Primary / Blue)              (Secondary / Gray)       |  |
|  |                                                            |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

### 7.2 Welcome Back Guide (App-Level Re-entry)

```
+------------------------------------------------------------------+
|  [Backdrop: Dark overlay]                                         |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                                                            |  |
|  |   Welcome back!                                            |  |
|  |   You were away for 3 hours.                               |  |
|  |                                                            |  |
|  |  +------------------------------------------------------+  |  |
|  |  |  [Page icon] Last seen on: Resume Editor             |  |  |
|  |  +------------------------------------------------------+  |  |
|  |                                                            |  |
|  |  You were working on your resume "Software Engineer CV".   |  |
|  |  Recent activity: Edited resume. Worked on section:        |  |
|  |  Experience.                                               |  |
|  |                                                            |  |
|  |  Your Recent Activity:                                     |  |
|  |  --------------------------------------------------------  |  |
|  |  [>] Worked on section: Experience        -- 3h ago        |  |
|  |  [>] Edited resume                        -- 3h ago        |  |
|  |  [>] Created a new resume                 -- 4h ago        |  |
|  |  --------------------------------------------------------  |  |
|  |                                                            |  |
|  |  "You were editing your resume. Pick up right where        |  |
|  |   you left off -- your progress is saved."                 |  |
|  |                                                            |  |
|  |  [ Continue to Editor ]        [ Go to Dashboard ]         |  |
|  |     (Primary / Blue)            (Secondary / Gray)         |  |
|  |                                                            |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

### 7.3 Editor with Progress Sidebar

```
+------------------------------------------------------------------+
| [Header: CV Builder | Dashboard | Editor | Preview | AI | Apps]  |
+----------+---------------------------------------------------+---+
|          |                                                   |   |
| PROGRESS |              EDITOR PANEL                         | P |
| SIDEBAR  |                                                   | R |
|          |  +---------------------------------------------+  | E |
| Overall  |  |  Contact Information          [Drag] [Eye]  |  | V |
| [===72%] |  |  +---------------------------------------+  |  | I |
|          |  |  | Full Name: [John Doe...............]  |  |  | E |
| Sections |  |  | Email:     [john@example.com........]  |  |  | W |
|          |  |  | Phone:     [+1234567890.............]  |  |  |   |
| * Contact|  |  | Location:  [San Francisco, CA........]  |  |   |
|   [100%] |  |  +---------------------------------------+  |  |   |
|          |  |                                             |  |   |
| * Summary|  |  +---------------------------------------------+  |
|   [75%]  |  |  |  Professional Summary       [Drag] [Eye]  |  |
|          |  |  |  +---------------------------------------+  |  |
|   Experie|  |  |  | [Passionate software engineer with  |  |  |
| * nce    |  |  |  |  5 years of experience in building  |  |  |
|   [50%]  |  |  |  |  scalable web applications........] |  |  |
|          |  |  |  +---------------------------------------+  |  |
| * Educati|  |  |                                             |  |
|   on     |  |  |  +---------------------------------------------+
|   [100%] |  |  |  |  Work Experience             [Drag] [Eye]  |
|          |  |  |  |  +---------------------------------------+  |
| * Skills |  |  |  |  | + Senior Developer at Tech Corp     |  |
|   [30%]  |  |  |  |  |   Jan 2021 - Present               |  |
|          |  |  |  |  |   [Leading frontend team............|  |
| -------- |  |  |  |  |   .................................]|  |
| Timeline |  |  |  |  |                                     |  |
| -------- |  |  |  |  |  [ + Add Experience ]               |  |
| 2m ago:  |  |  |  |  +---------------------------------------+
|  Edited  |  |                                                |
|  summary |  |                                                |
| 5m ago:  |  +------------------------------------------------+
|  Added   |
|  skills  |
| 12m ago: |
|  Created |
|  resume  |
|          |
+----------+---------------------------------------------------+---+
```

### 7.4 Interruption Toast (Offline)

```
+------------------------------------------------------------------+
|                                                                   |
|  [Normal editor content continues behind]                        |
|                                                                   |
|                                                                   |
|                                                                   |
|                                                                   |
|                                                                   |
|                                                                   |
|   +----------------------------------------------------------+   |
|   | [!] You're offline. Your progress is saved locally and   |   |
|   |     will sync when you reconnect.                        |   |
|   +----------------------------------------------------------+   |
|   (Amber background, persistent until online)                    |
|                                                                   |
+------------------------------------------------------------------+
```

### 7.5 Interruption Toast (Idle)

```
+------------------------------------------------------------------+
|                                                                   |
|  [Normal editor content continues behind]                        |
|                                                                   |
|                                                                   |
|                                                                   |
|                                                                   |
|                                                                   |
|                                                                   |
|   +----------------------------------------------------------+   |
|   | [i] Your session is auto-saved. You can safely close     |   |
|   |     and come back anytime.                      [Dismiss]|   |
|   +----------------------------------------------------------+   |
|   (Blue background, auto-dismiss after 8 seconds)                |
|                                                                   |
+------------------------------------------------------------------+
```

### 7.6 Dashboard with Resume Card & Pending Apps

```
+------------------------------------------------------------------+
| [Header: CV Builder | Dashboard | Editor | Preview | AI | Apps]  |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------------------------------------------------+  |
|  | [Resume icon] Continue "Software Engineer CV" -- 72%       |  |
|  | Last edited 2 hours ago                                    |  |
|  |                                                            |  |
|  | [====] Contact 100%  [===.] Summary 75%  [==..] Exp 50%   |  |
|  |                                                            |  |
|  |              [ Continue Where You Left Off ]               |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  | [Bell icon] Pending Applications                           |  |
|  | You have 2 applications that need attention:               |  |
|  |                                                            |  |
|  | * Google - Frontend Engineer    -- 26h overdue  [Open]     |  |
|  | * Meta   - React Developer      -- 3h overdue   [Open]     |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  Your Resumes                     [Search...] [Grid] [List]      |
|  ---------------------------------------------------------------- |
|  +-------------------+  +-------------------+  +--------------+  |
|  | Software Engineer |  | Product Designer  |  |   + New      |  |
|  | CV                |  | Resume            |  |   Resume     |  |
|  |                   |  |                   |  |              |  |
|  | Updated 2h ago    |  | Updated 5d ago    |  |              |  |
|  |                   |  |                   |  |              |  |
|  | [Edit] [Preview]  |  | [Edit] [Preview]  |  |              |  |
|  | [Duplicate] [Del] |  | [Duplicate] [Del] |  |              |  |
|  +-------------------+  +-------------------+  +--------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

### 7.7 Application Workspace (Embedded Browser)

```
+------------------------------------------------------------------+
| [Header: CV Builder | Dashboard | Editor | Preview | AI | Apps]  |
+------------------------------------------------------------------+
|                                                                   |
|  Application Tracker                          [ + New Application]|
|                                                                   |
|  +-------------------+  +-------------------+  +---------------+  |
|  | Google            |  | Meta              |  | Stripe        |  |
|  | Frontend Engineer |  | React Developer   |  | Full Stack    |  |
|  |                   |  |                   |  |               |  |
|  | [IN PROGRESS]     |  | [IN PROGRESS]     |  | [SUBMITTED]   |  |
|  | Last: 26h ago     |  | Last: 3h ago      |  | Last: 2d ago  |  |
|  |                   |  |                   |  |               |  |
|  | [Open] [Notes]    |  | [Open] [Notes]    |  | [View]        |  |
|  +-------------------+  +-------------------+  +---------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  | Workspace: Google - Frontend Engineer                      |  |
|  +------------------------------------------------------------+  |
|  |                                |  Quick Copy Fields:       |  |
|  |  +---------------------------+|                            |  |
|  |  | [iframe or fallback       ||  Full Name  [Copy]         |  |
|  |  |  message for cross-origin ||  Email      [Copy]         |  |
|  |  |  sites]                   ||  Phone      [Copy]         |  |
|  |  |                           ||  Summary    [Copy]         |  |
|  |  |  "This site blocks        ||  Experience [Copy]         |  |
|  |  |   embedding. Click        ||                            |  |
|  |  |   below to open in a     ||  Notes:                    |  |
|  |  |   new tab. Use the copy  ||  [Need to tailor summary   |  |
|  |  |   fields on the right    ||   for React experience..   |  |
|  |  |   to quickly paste your  ||   ........................] |  |
|  |  |   information."          ||                            |  |
|  |  |                           ||  [ Mark as Submitted ]     |  |
|  |  |  [ Open in New Tab ]      ||  [ Abandon ]               |  |
|  |  +---------------------------+|                            |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Appendix A: Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Styling | TailwindCSS | Utility-first CSS |
| Animation | Framer Motion | Recovery modal, toasts |
| Routing | React Router v6 | SPA navigation |
| Build | Vite | Dev server + bundler |
| Backend | Express + TypeScript | REST API server |
| Database | SQLite (better-sqlite3) | Persistent storage |
| AI | Google Gemini 2.0 Flash | Scoring, nudges, suggestions |
| Scheduling | node-cron | Reminder checks |
| Auth | Token-based (x-resumate-token) | Simple hackathon auth |

## Appendix B: File Structure

```
Resumate/
+-- src/
|   +-- App.tsx                              # Root with providers
|   +-- contexts/
|   |   +-- AuthContext.tsx                   # Authentication state
|   |   +-- CVContext.tsx                     # CV data management
|   |   +-- SessionContext.tsx                # Session intelligence bridge
|   +-- services/
|   |   +-- sessionService.ts                # Core session singleton
|   |   +-- globalSessionService.ts          # App-wide activity tracking
|   |   +-- applicationTracker.ts            # Job application CRUD
|   |   +-- aiService.ts                     # Gemini client integration
|   |   +-- apiClient.ts                     # Backend HTTP client
|   +-- utils/
|   |   +-- completionCalculator.ts          # Section progress calc
|   +-- components/
|   |   +-- recovery/
|   |   |   +-- RecoveryScreen.tsx            # CV-level return modal
|   |   |   +-- WelcomeBackGuide.tsx          # App-level return guide
|   |   |   +-- RouteTracker.tsx              # Invisible route logger
|   |   +-- editor/
|   |   |   +-- CVEditor.tsx                  # Main editor with sidebar
|   |   |   +-- ProgressSidebar.tsx           # Progress visualization
|   |   |   +-- SectionEditor.tsx             # Section form wrapper
|   |   +-- ui/
|   |   |   +-- InterruptionToast.tsx         # Offline/idle toasts
|   |   +-- browser/
|   |       +-- EmbeddedBrowser.tsx           # Application workspace
|   +-- pages/
|       +-- Dashboard.tsx                     # Resume card + apps widget
|       +-- LandingPage.tsx
|       +-- PreviewPage.tsx
|       +-- AIAssistantPage.tsx
+-- server/
    +-- src/
    |   +-- index.ts                          # Express entry point
    |   +-- config.ts                         # Environment config
    |   +-- db.ts                             # SQLite schema + helpers
    |   +-- middleware/
    |   |   +-- auth.ts                       # Token authentication
    |   |   +-- rateLimit.ts                  # API rate limiting
    |   +-- routes/
    |   |   +-- health.ts                     # GET /api/health
    |   |   +-- sessions.ts                   # Session CRUD
    |   |   +-- cvs.ts                        # CV data sync
    |   |   +-- applications.ts               # Application tracking
    |   |   +-- score.ts                      # Gemini scoring proxy
    |   |   +-- reminders.ts                  # Reminder management
    |   +-- services/
    |       +-- geminiService.ts              # Server-side Gemini calls
    |       +-- reminderScheduler.ts          # Background cron job
    +-- data/
        +-- resumate.db                       # SQLite database file
```

## Appendix C: API Contract Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Server status + DB check |
| POST | `/api/sessions/:cvId/save` | Yes | Upsert session state |
| GET | `/api/sessions/:cvId` | Yes | Retrieve session |
| GET | `/api/sessions` | Yes | List all user sessions |
| DELETE | `/api/sessions/:cvId` | Yes | Delete session |
| POST | `/api/cvs` | Yes | Create/upsert CV |
| GET | `/api/cvs` | Yes | List user CVs |
| GET | `/api/cvs/:id` | Yes | Get specific CV |
| DELETE | `/api/cvs/:id` | Yes | Delete CV |
| POST | `/api/applications` | Yes | Create application + auto-schedule 24h reminder |
| GET | `/api/applications` | Yes | List user applications |
| GET | `/api/applications/:id` | Yes | Get specific application |
| PUT | `/api/applications/:id` | Yes | Update application |
| DELETE | `/api/applications/:id` | Yes | Delete application |
| POST | `/api/score` | Yes | Gemini resume credibility score (cached 1h) |
| POST | `/api/score/analyze` | Yes | Detailed AI resume analysis |
| POST | `/api/score/nudge` | Yes | Quick AI nudge for returning user |
| POST | `/api/reminders/schedule` | Yes | Schedule a reminder |
| GET | `/api/reminders` | Yes | List user reminders |
| GET | `/api/reminders/due` | Yes | Get past-due reminders |
| POST | `/api/reminders/:id/dismiss` | Yes | Dismiss a reminder |

## Appendix D: Session State Schema

```json
{
  "cvId": "cv_abc123",
  "activeSection": "experience",
  "lastCursorField": "exp_2_description",
  "scrollPosition": 320,
  "unsavedDraftText": {
    "exp_2_description": "Led revamp of X..."
  },
  "aiConversationState": {
    "messages": [
      { "role": "user", "text": "Improve my summary", "ts": 1670000000000 }
    ],
    "pendingPrompt": null
  },
  "sessionTimestamps": {
    "sessionStart": 1670000000000,
    "lastActive": 1670000100000,
    "totalEditingTime": 120000
  },
  "sectionCompletionMap": {
    "contact": 100,
    "summary": 75,
    "experience": 50,
    "education": 100,
    "skills": 30
  },
  "interruptionType": "idle_timeout",
  "actionLog": [
    { "ts": 1670000010000, "action": "edited_field", "meta": { "field": "summary" } },
    { "ts": 1670000050000, "action": "section_expanded", "meta": { "section": "experience" } },
    { "ts": 1670000090000, "action": "interruption_detected", "meta": { "type": "idle_timeout" } }
  ],
  "deviceId": "device_1738800000_a3f2k1"
}
```

---

> **spine-hangar** | Resumate Session Intelligence & Recovery | DesignBlitz Round 2

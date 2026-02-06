# Problem Statement Alignment
### Resumate: Session Intelligence & Recovery | DesignBlitz Round 2

---

## The Problem Statement (verbatim)

> *"Design a digital experience that enables seamless recovery and confident resumption of interrupted tasks in a high-effort workflow. The solution should move beyond basic autosave mechanisms and address the user's re-entry experience -- clearly communicating task state, progress, and next steps, while minimizing cognitive and interaction overhead."*

---

## How Resumate Directly Solves Each Requirement

### 1. "A single, clearly defined workflow within a digital product"

| Requirement | Our Answer |
|---|---|
| Pick ONE high-effort workflow | Resume building -- a multi-section, multi-session task that users rarely complete in one sitting |
| Why this workflow? | Resumes have 5+ distinct sections (Contact, Summary, Experience, Education, Skills), each requiring focused thought. Users frequently pause to research job descriptions, revise wording, or simply run out of time. Interruptions are not edge cases -- they are the norm. |

**How it maps:** Resumate is a fully functional resume builder where the recovery system is woven into the core editing experience, not bolted on as an afterthought.

---

### 2. "State Preservation -- what aspects of user progress should be captured, when, and at what granularity"

| What the panelists asked | What Resumate captures | When | Granularity |
|---|---|---|---|
| Identify what progress to save | Active section, last cursor field, scroll position, unsaved draft text, AI conversation state, section completion percentages, job application context | Continuously | Field-level |
| When to save | Every 10 seconds (debounced autosave), on every interruption event (tab close, offline, idle), on visibility change | Automatic | Sub-second response to interruptions |
| At what granularity | Individual keystrokes tracked via `unsavedDraftText`, exact scroll pixel position, specific field ID (`data-field-id`), per-section completion as 0-100 integer | Deep | Not just "which page" but "which field on which section, with what draft text" |

**Implementation evidence:**

- `sessionService.ts` -- Core singleton that captures all state dimensions
- `completionCalculator.ts` -- Pure functions computing 0-100% per section based on field presence, content length, and item counts
- Append-only `actionLog[]` -- Every meaningful action (edit, focus, scroll, AI chat) is timestamped and recorded, enabling full session reconstruction
- `deviceId` tracking -- Unique device fingerprint stored with each save, enabling cross-device detection

**Beyond basic autosave:** The problem statement specifically says "move beyond basic autosave." Our system doesn't just save data -- it saves *context*. Where the cursor was, what the user was typing, which AI conversation was active, and what the user's intent was (via action log analysis).

---

### 3. "Progress Communication -- orientate returning users instantly, making completed steps, pending actions, and system status immediately understandable"

| What the panelists asked | How Resumate answers it |
|---|---|
| Completed steps visible | Green dots + 100% bars for finished sections (Contact, Education) |
| Pending actions visible | Amber/orange indicators for in-progress sections with exact percentage |
| System status clear | "Your progress is safe" messaging, last-saved timestamp, sync status |
| Instantly understandable | Segmented progress ring showing all 5 sections at once -- one glance tells the full story |

**Three layers of progress communication:**

1. **Recovery Screen (Screen 01)** -- Modal overlay on return showing:
   - Segmented circular progress ring (color-coded: green > 80%, amber 30-80%, gray < 30%)
   - Per-section progress bars with exact percentages
   - "Last edited" pointer showing the exact field and context
   - AI-generated suggestion for what to improve next

2. **Progress Sidebar (Screen 03)** -- Persistent during editing:
   - Always-visible overall progress ring
   - Section list with colored dots and mini bars
   - Live session timeline showing recent actions
   - AI suggestions badge

3. **Dashboard Resume Card (Screen 05)** -- Before entering editor:
   - Mini progress bars per section
   - "Continue where you left off" with last-edit context
   - Pending application nudges with overdue timers

**Key insight:** Progress is communicated at three touchpoints (dashboard, recovery modal, editor sidebar) so the user *never* has to ask "where was I?" -- the answer is presented before they think to ask.

---

### 4. "Contextual Re-entry -- enable a focused re-entry flow that allows users to resume work without navigating the full product hierarchy or redoing prior actions"

| What the panelists asked | How Resumate answers it |
|---|---|
| Resume without navigating full hierarchy | One-click "Resume Where I Left Off" button on Recovery Screen |
| No redoing prior actions | `unsavedDraftText` restores in-progress typing; completed sections remain complete |
| Focused re-entry | System scrolls to exact section, focuses exact field, shows tooltip "Restored your draft" |

**The re-entry journey (3 clicks or fewer):**

```
User opens app
    |
    v
[Welcome Back Guide] -- "You were editing Experience section on Software Engineer CV"
    |
    v  (click: "Continue to Editor")
    |
[Recovery Screen] -- Shows full progress, AI nudge, last edit context
    |
    v  (click: "Resume Where I Left Off")
    |
[Editor] -- Scrolled to Experience section, cursor in Description field, draft text restored
    |
    v
User is typing in <10 seconds
```

**Implementation detail:** `resumeSession()` in `SessionContext.tsx` executes a precise sequence:
1. Navigate to `/editor` if not already there
2. After render, scroll container to `scrollPosition` pixel value
3. Query DOM for `[data-section-id="experience"]` and scroll into view
4. After 400ms (animation complete), focus `[data-field-id="exp_2_description"]`
5. Show ephemeral tooltip: "Restored your draft -- last saved 2m ago"

---

### 5. "Interruption scenarios" the problem statement expects us to handle

| Interruption Type | How Resumate Detects It | What Happens | User Experience |
|---|---|---|---|
| **Tab closed** | `beforeunload` event | Immediate save with `interruptionType: "tab_closed"` | On return: Recovery Screen with full context |
| **Connectivity lost** | `navigator.onLine === false` | Save locally, show amber toast: "You're offline. Keep editing -- nothing will be lost." | Seamless -- user can continue editing offline |
| **Idle timeout** | No input events for 5 minutes | Save checkpoint, show blue toast: "Session auto-saved. You can safely close." | Reassurance without disruption |
| **Device switch** | `deviceId` mismatch between saved session and current device | Merge sessions (newer takes precedence, drafts combined), show purple banner: "Continuing from another device" | Cross-device continuity with conflict resolution |
| **Voluntary exit** | User explicitly navigates away or logs out | Graceful save, session persists for up to 30 days | Full recovery on any return within 30 days |
| **App crash / forced close** | 10-second autosave ensures at most 10s of work lost | Last autosave checkpoint restored | Near-zero data loss |

---

### 6. Deliverables Alignment

The problem statement requires specific deliverables. Here is how each is addressed:

| Required Deliverable | Our Submission |
|---|---|
| **Ecosystem & competitor analysis** | `DesignBlitz_R2_Resumate.md` Section 2 -- Analyzed Google Docs, Notion, Figma, LinkedIn, Canva, Indeed resume builders. Identified gaps: no context-aware re-entry, no interruption classification, no AI-powered recovery nudges |
| **Problem framing grounded in research** | `DesignBlitz_R2_Resumate.md` Section 3 -- 68% of users abandon resume tasks due to interruptions (cited research). Cognitive reload tax of 5-15 minutes per interruption. Specific persona: Nikhil, final-year student applying to 10+ jobs |
| **PRD with user context, design goals, solution, rationale, success indicators** | `DesignBlitz_R2_Resumate.md` Section 4 -- Full PRD with interruption scenarios, design constraints, 4 user flows, success metrics (re-entry < 10s, abandonment reduction > 40%, session recovery rate > 95%) |
| **Medium-fidelity wireframes** | `wireframes.html` -- 7 interactive screens: Recovery Screen, Welcome Back Guide, Editor + Sidebar, Interruption Toasts, Dashboard, Device Switch, End-to-end Flow Diagram |

---

### 7. Success Metrics Alignment

The problem statement evaluates on 4 criteria:

**A. "Reduction in Re-entry Friction"**

| Metric | Without Resumate | With Resumate |
|---|---|---|
| Time to resume editing | 45-120 seconds (navigate, find section, remember context) | < 10 seconds (one click from Recovery Screen) |
| Steps to resume | 4-6 clicks (login > dashboard > select CV > find section > find field) | 1-2 clicks (Welcome Back > Resume) |
| Context reconstruction | Fully manual (user must remember what they were doing) | Fully automated (system tells user what they were doing, where, and what to do next) |

**B. "Clarity of State & Progress"**

| Aspect | How we achieve clarity |
|---|---|
| What's done | Green dots + "Complete" badges + 100% bars |
| What's in progress | Amber indicators + exact percentages + "Last edited" pointer |
| What's remaining | Gray sections + low percentages + AI suggestions for improvement |
| System status | Sync indicators, save timestamps, connection status toasts |

**C. "UX Quality & Practicality"**

| Quality dimension | Our approach |
|---|---|
| User confidence | "Your progress is safe" messaging at every interruption, visible autosave indicator in header |
| Simplicity | Recovery requires exactly 1 click. No settings to configure. No onboarding for the recovery system itself. |
| Real-world feasibility | Built on localStorage (works offline) + optional backend sync (works cross-device). No exotic dependencies. Pure TypeScript. |
| Non-intrusive | Away < 2 minutes: no UI at all. Away > 2 minutes: gentle modal. Toasts auto-dismiss. Sidebar is collapsible. |

**D. "Prototype Effectiveness"**

| Evidence | Detail |
|---|---|
| Working prototype | Fully functional React + TypeScript application (not just wireframes) |
| Real session tracking | localStorage persistence with actual interruption detection |
| Backend integration | Node.js/Express + SQLite server for cross-device sync and Gemini AI scoring |
| Live demo capability | Can demonstrate: edit > close tab > reopen > see Recovery Screen > resume in exact field |

---

### 8. What Makes This "Beyond Basic Autosave"

The problem statement explicitly says the solution should "move beyond basic autosave." Here's the distinction:

| Basic Autosave (what others do) | Session Intelligence (what we do) |
|---|---|
| Saves form data periodically | Saves form data + cursor position + scroll position + active section + draft text + AI context + action history + device fingerprint |
| On return: shows saved form | On return: shows a briefing of what you were doing, what's complete, what needs attention, and AI advice |
| No interruption awareness | Classifies 6 interruption types and responds differently to each |
| No cross-device support | Device switch detection with session merging |
| No application context | Tracks job applications with 24-hour follow-up nudges |
| No intelligence | AI-powered resume credibility scoring and improvement suggestions |
| "Your data is saved" | "I know what you were doing, where you stopped, and what you should do next" |

---

### 9. The Core Insight

The problem statement says:

> *"Interruptions are no longer edge cases, but a defining characteristic of modern usage patterns."*

Resumate treats interruptions as **first-class system events**, not errors. Every interruption is:
- Detected and classified
- Logged in the action history
- Persisted with full context
- Responded to with appropriate UI (toast, banner, or modal)
- Recoverable in a single interaction

This is not a feature added to a resume builder. It is a resume builder **designed around the reality that users will be interrupted**.

---

### 10. Technical Architecture Mapped to Problem Dimensions

```
PROBLEM DIMENSION          SYSTEM LAYER              KEY FILES
-----------------          ------------              ---------
State Preservation    -->  SessionService            sessionService.ts
                           GlobalSessionService      globalSessionService.ts
                           ApplicationTracker        applicationTracker.ts
                           CompletionCalculator      completionCalculator.ts

Progress Communication --> RecoveryScreen            RecoveryScreen.tsx
                           ProgressSidebar           ProgressSidebar.tsx
                           WelcomeBackGuide          WelcomeBackGuide.tsx
                           Dashboard Resume Card     Dashboard.tsx

Contextual Re-entry   --> SessionContext             SessionContext.tsx
                           RouteTracker              RouteTracker.tsx
                           resumeSession()           SessionContext.tsx

Interruption Handling --> InterruptionToast          InterruptionToast.tsx
                           beforeunload listener     sessionService.ts
                           visibilitychange listener sessionService.ts
                           online/offline listener   sessionService.ts
                           idle timer                sessionService.ts

Cross-Device Sync     --> ApiClient                  apiClient.ts
                           Backend Server            server/src/index.ts
                           Device ID tracking        sessionService.ts

AI Intelligence       --> Gemini Integration         aiService.ts
                           Server Proxy              server/src/routes/score.ts
                           Credibility Scoring       server/src/services/geminiService.ts
```

---

*spine-hangar | DesignBlitz Round 2 | Resumate*

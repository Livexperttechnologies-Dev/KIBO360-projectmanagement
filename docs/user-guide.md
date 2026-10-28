# KIBO360 Project Hub — End User Guide

User manual for **Livexpert Technologies Pvt. Ltd.** employees, team leads, and managers.

---

## 1. Getting Started

### 1.1 Accessing the Application
- **Production URL**: [https://kibo360.livexpert.in](https://kibo360.livexpert.in)
- **Local / Internal Network**: [http://localhost:5173](http://localhost:5173)

### 1.2 Signing In
1. Navigate to the login screen.
2. Enter your corporate email address (`username@livexpert.in`) and password.
3. Click **Sign In**.
4. Upon successful sign-in, you are directed to your role-personalized Dashboard.

### 1.3 Resetting Your Password
1. On the login screen, click **Forgot your password?**.
2. Enter your email address and click **Send Reset Link**.
3. Check your corporate email inbox for the single-use reset link (valid for 60 minutes).
4. Enter your new password (minimum 8 characters with numbers and symbols) and submit.

---

## 2. Navigating the Dashboard

The Dashboard provides a consolidated snapshot of your work:

- **Executive Metric Cards**:
  - **Active Projects**: Total initiatives currently in Planning, Active, or In Progress.
  - **Open Deliverables**: Total tasks assigned to you or in your departmental scope.
  - **Approaching Deadlines**: Deliverables due within 24–48 hours requiring attention.
  - **Overdue Items**: Deliverables that are past their due date (highlighted in red).
- **Upcoming Deadlines Feed**: Chronological list of upcoming deliverables with days-remaining counters.
- **Role Scoping**: As an employee, you automatically see metrics scoped to your assigned department (`Software / IT` or `Product / Design`).

---

## 3. Projects Directory

Click **Projects** in the primary navigation sidebar to browse corporate initiatives.

### 3.1 Searching and Filtering
- **Search Bar**: Type any text to match project title, key (e.g. `HUB`, `CRM`), or description.
- **Status Filter**: Switch between `All`, `Planning`, `Active`, `In Progress`, `On Hold`, `Completed`, and `Archived`.
- **Department Filter**: Isolate projects by `Software / IT` or `Product / Design`.
- **Priority Filter**: Filter by `Low`, `Medium`, `High`, or `Urgent`.

### 3.2 Inspecting Project Details
Click on any project card to open the Project Drawer:
- **Overview Tab**: Project description, priority pill, target delivery date, and owner profile.
- **Milestones Tab**: Progress bar showing reached milestones vs total milestones. Click a milestone checkbox to mark it completed.
- **Team Roster Tab**: View all colleagues assigned to the project with their designated roles (`LEAD`, `CONTRIBUTOR`, `VIEWER`).

---

## 4. Task & Deliverable Management

Click **Tasks** in the sidebar to open the collaborative deliverable boards.

### 4.1 Kanban vs List View
Toggle between views using the toolbar icons in the top-right:
- **Kanban Board**: Drag-and-drop cards across 7 lifecycle stages:
  1. `Open` — Backlog deliverables awaiting triage.
  2. `Assigned` — Deliverable allocated to an owner.
  3. `In Progress` — Work actively underway.
  4. `Under Review` — Awaiting peer review or QA approval.
  5. `Changes Required` — Review feedback requires revisions.
  6. `Blocked` — Waiting on external blockers or prerequisites.
  7. `Completed` — Finished deliverable (100% completion).
- **List View**: Dense, sortable table format ideal for scanning multiple deliverables, assignees, effort hours, and deadlines.

### 4.2 Creating a New Task
1. Click **+ New Task** in the top navigation.
2. Complete the required fields:
   - **Task Title**: Concise, action-oriented name.
   - **Project**: Select from accessible projects.
   - **Assignee**: Designate responsible colleague.
   - **Priority**: Select `Low`, `Medium`, `High`, or `Urgent`.
   - **Estimated Effort**: Enter estimated engineering hours.
   - **Start & Due Dates**: Select valid calendar range.
3. Click **Create Task**. The assignee receives an immediate in-app notification.

### 4.3 Subtasks
Break down complex parent tasks into discrete sub-deliverables:
1. Open the task detail modal.
2. In the **Subtasks** section, enter the subtask title and click **Add Subtask**.
3. *Date Boundary Rule*: Subtask start and due dates cannot fall outside the parent task's date boundaries.

### 4.4 Prerequisite Dependencies
To prevent out-of-order execution:
1. Open the **Dependencies** section in a task modal.
2. Link another task as a prerequisite.
3. *Blocked Work Rule*: A task with an incomplete dependency cannot be marked `COMPLETED` until all prerequisite tasks reach 100% completion.

### 4.5 Comments & File Attachments
- **Activity & Comments**: Post questions, updates, and feedback. Comments display author avatars and timestamps.
- **Attachments**: Drag and drop documents, logs, or screenshots (up to 15MB).
- **Access Scopes**:
  - `Public` — Visible to all organization members.
  - `Project Members` — Restricted to colleagues assigned to the project.
  - `Assignee Only` — Highly confidential; accessible only by the assignee and creator.

---

## 5. Deadline & Calendar Management

Click **Calendar** in the sidebar to access the organizational schedule.

### 5.1 Views
- **Month View**: Bird's-eye view of monthly deliverables and milestones.
- **Week View**: Hourly calendar grid showing start times and approaching deadlines.
- **Day View**: Focused daily schedule.

### 5.2 Deadline Indicators
- 🔴 **Overdue (Past Due)**: Open deliverables past deadline in company timezone (`Asia/Kolkata`).
- 🟡 **Approaching (Within 24 Hours)**: Deliverables requiring urgent triage.
- 🔵 **Upcoming (Within 7 Days)**: Deliverables scheduled for completion this week.
- 🟢 **Completed**: Deliverables finished on or before target date.

---

## 6. Notifications & Personal Preferences

### 6.1 In-App Notification Bell
The bell icon in the top header displays your current unread notification count.
- Click the bell to open the notification drawer.
- Click any notification to jump directly to the relevant project or deliverable.
- Click **Mark All Read** to clear badge counters.

### 6.2 Managing Notification Preferences
1. Click your profile avatar in the sidebar and select **Notification Preferences**.
2. Toggle in-app and email alert switches for:
   - *New task assignments*
   - *Upcoming deadline reminders*
   - *Overdue escalation alerts*
   - *Review requests & feedback*
   - *Approaching milestones*
3. Click **Save Preferences**.

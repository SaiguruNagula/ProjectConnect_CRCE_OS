# My Projects: Architectural Audit & Refinement Plan

## 1. Structural Audit

### Sections
| Section | Purpose | Backend Connection | Connected Module | Should Keep? | Reason / Improvement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Header Stats** | Quick situational awareness | Count(Projects) where user=member | Project Space | **YES** | Critical for student status at a glance. |
| **Quick Actions** | Entry points for new/existing work | N/A | Innovation Hub | **MODIFY** | Remove "Create Project" (bypasses lifecycle). Keep "Browse Problems". |
| **Active Projects** | Primary workspace access | GET /projects/active | Project Space | **YES** | The "doing" part of the OS. Essential. |
| **Pending Invitations** | Collaboration entry point | GET /invites/pending | Team Formation | **YES** | Necessary for team growth and onboarding. |
| **Completed Projects** | Verification & Portfolio link | GET /projects/completed | Portfolio / Credits | **YES** | Proof-of-work link to institutional rewards. |

### Buttons & Actions
| Component | Purpose | Backend Action | Destination | Keep? | Reason |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Browse Problems** | Discover new work | GET /problems | Innovation Hub | **YES** | Correct lifecycle entry point. |
| **Create Project** | Start manual project | POST /project | N/A | **REMOVE** | Students must solve problems from the Hub, not invent them. |
| **Open Workspace** | Enter active work env | GET /workspace/:id | Project Space | **YES** | Primary action for active students. |
| **Accept/Reject** | Respond to invitations | PATCH /invites/:id | Team Formation | **YES** | Critical for forming teams. |
| **View Project** | Review completed work | GET /archive/:id | Portfolio | **MODIFY** | Rename to "View in Portfolio" to reinforce module connection. |

---

## 2. Refined Page Structure (Top to Bottom)

1.  **Welcome Header**: "My Projects" with summary tokens (Active, Pending, Completed).
2.  **Primary Action Bar**: Single high-visibility button: "Browse Open Problems".
3.  **Active Projects List**: Cards showing progress, current milestone, and "Open Workspace".
4.  **Pending Invitations**: Minimalist list of requests with Accept/Reject.
5.  **Historical Record**: Completed projects linked directly to Portfolio/Credits.

---

## 3. User Flow
Student enters page 
↓ 
Checks **Active Projects** (Status check) 
↓ 
Accepts **Pending Invitation** (Join new team) 
↓ 
Clicks **Open Workspace** (Deep link to Project Space) 
↓ 
Completes Milestones (Project Space → Review Engine) 
↓ 
Earns Credits (Credit Engine) 
↓ 
Project moves to **Completed** list 
↓ 
**Portfolio** & **Leaderboard** update automatically.

---

## 4. Backend Requirements
- **Database Entities**: `Project`, `Membership`, `Invitation`, `Milestone`.
- **API Endpoints**: 
    - `GET /v1/student/projects` (with status filters)
    - `GET /v1/student/invitations`
    - `PATCH /v1/invitations/:id` (Accept/Reject)
- **Models**: `ProjectCard` (Name, Status, Progress, NextAction).

---

## 5. Component Summary Table

| Component | Keep | Modify | Remove | Connected Module |
| :--- | :---: | :---: | :---: | :--- |
| Stats Summary | X | | | Project Space |
| Browse Problems | X | | | Innovation Hub |
| Create Project | | | X | N/A |
| Active Project Cards | | X | | Project Space |
| Pending Invitations | X | | | Team Formation |
| Completed Projects | | X | | Portfolio / Credit Engine |
| "Open Workspace" Button| X | | | Project Space |

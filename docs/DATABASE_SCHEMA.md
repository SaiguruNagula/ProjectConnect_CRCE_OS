# 06_DATABASE_SCHEMA.md

# 1. Document Information

| Item | Details |
|------|---------|
| Document | Database Schema |
| Product | CRCE OS (Campus Operating System) |
| Version | 1.0 |
| Status | Active |
| Owner | CRCE OS Development Team |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migration Tool | Alembic |

---

## Purpose

This document defines the complete database architecture for CRCE OS.

It serves as the single source of truth for:

- Database design
- Entity relationships
- Table structures
- Constraints
- Naming conventions
- Future scalability

Every database change must remain consistent with this document.

---

# 2. Database Overview

CRCE OS uses a relational database built on PostgreSQL to support the complete innovation lifecycle of the platform.

The database is designed around the principle that every piece of information should exist only once while remaining easily accessible through well-defined relationships.

The database stores:

- User Accounts
- Authentication
- Roles & Permissions
- Problems
- Teams
- Projects
- Reviews
- Credit Transactions
- Leaderboards
- Portfolios
- Notifications
- Analytics
- System Logs

---

## Database Objectives

- Maintain data integrity.
- Avoid duplication.
- Support future expansion.
- Ensure ACID compliance.
- Optimize query performance.
- Support role-based access.
- Enable automatic portfolio generation.
- Provide reliable analytics.

---

## Database Philosophy

The database is not simply a storage layer.

It is the foundation of the CRCE OS ecosystem.

Every module should interact through clearly defined relationships rather than isolated tables.

Business logic should remain in the application layer, while PostgreSQL focuses on storing consistent, reliable, and normalized data.

---

# 3. Database Design Principles

The database follows the following engineering principles.

---

## Single Source of Truth

Every type of information has exactly one authoritative source.

Examples:

| Data | Source |
|------|--------|
| Users | users |
| Problems | problems |
| Projects | projects |
| Reviews | reviews |
| Credits | credit_transactions |
| Leaderboard | Generated from Credit Engine |
| Portfolio | Generated from Verified Platform Data |

Duplicate storage of business data should be avoided.

---

## Normalization

The schema follows Third Normal Form (3NF) wherever practical.

Objectives:

- Eliminate redundant data
- Reduce update anomalies
- Improve maintainability
- Preserve consistency

---

## Referential Integrity

All relationships must use foreign keys.

Examples:

- Project belongs to Team
- Team belongs to Problem
- Review belongs to Project
- Credit belongs to User

Orphaned records should never exist.

---

## Auditability

Critical entities should maintain:

- created_at
- updated_at
- created_by
- updated_by

Where appropriate:

- deleted_at
- deleted_by

This ensures traceability and simplifies auditing.

---

## Scalability

The schema should support:

- Thousands of students
- Hundreds of faculty
- Thousands of projects
- Multiple academic years
- Multiple departments

Future expansion should require minimal schema changes.

---

## Performance

The schema is designed for:

- Fast joins
- Indexed searches
- Efficient pagination
- Optimized filtering
- Minimal redundancy

Performance optimizations should never compromise data integrity.

---

## Security

Sensitive information must never be stored in plain text.

Passwords are always hashed.

Secrets are never stored in the database.

Personally identifiable information should be protected according to institutional policies.

---

# 4. Naming Conventions

Consistency is mandatory across the database.

---

## Tables

Use:

```
snake_case
```

Examples:

```
users
projects
project_members
faculty_reviews
credit_transactions
portfolio_entries
notifications
```

---

## Columns

Use:

```
snake_case
```

Examples:

```
first_name
created_at
updated_at
department_id
credit_score
```

---

## Primary Keys

Use:

```
id
```

---

## Foreign Keys

Use:

```
user_id
problem_id
team_id
project_id
faculty_id
department_id
review_id
```

---

## Timestamp Columns

Every major table should include:

```
created_at
updated_at
```

Optional:

```
deleted_at
```

---

## Boolean Fields

Use clear names:

```
is_active
is_verified
is_public
is_archived
is_deleted
```

---

## Junction Tables

Use plural naming that reflects the relationship.

Examples:

```
team_members
project_tags
faculty_departments
```

---

## Constraints

Use descriptive names.

Examples:

```
fk_project_team
fk_review_project
uq_user_email
idx_problem_status
```

---

# 5. Entity Relationship Diagram

The logical relationship between the major entities is illustrated below.

```text
Department
     │
     │
     ▼
Users
     │
     ├──────────────┐
     │              │
     ▼              ▼
Problems        Notifications
     │
     ▼
Teams
     │
     ▼
Projects
     │
     ▼
Reviews
     │
     ▼
Credit Transactions
     │
     ├──────────────┐
     │              │
     ▼              ▼
Leaderboard    Portfolio
                     │
                     ▼
Analytics
```

---

## Relationship Flow

Faculty creates Problems.

Students join Teams.

Teams build Projects.

Projects receive Reviews.

Approved Reviews trigger Credit Transactions.

Credit Transactions update the Leaderboard.

Verified activity automatically updates Portfolios.

Institution-wide data feeds Analytics.

This flow must remain consistent throughout the system.

---

# 6. Core Entities

The following entities represent the foundation of CRCE OS.

| Entity | Purpose |
|---------|---------|
| User | Student, Faculty, Admin, Principal accounts |
| Department | Academic departments |
| Role | System roles and permissions |
| Problem | Innovation opportunities |
| Team | Student collaboration groups |
| Project | Solution implementation |
| Review | Faculty evaluation |
| Credit Transaction | Verified contribution records |
| Leaderboard Entry | Calculated rankings |
| Portfolio Entry | Verified achievements |
| Notification | System communication |
| Analytics Snapshot | Aggregated institutional metrics |

---

## Entity Ownership

| Entity | Owner Module |
|----------|--------------|
| User | Authentication |
| Problem | Innovation Hub |
| Team | Team Formation |
| Project | Project Space |
| Review | Review Engine |
| Credit Transaction | Credit Engine |
| Leaderboard | Credit Engine |
| Portfolio | Portfolio Module |
| Notification | Notification Service |
| Analytics | Analytics Engine |

Each entity has one owner.

Business logic must never be duplicated across modules.

---

# 7. Authentication Tables

Authentication is responsible for user identity, access control, and session management.

---

## users

Stores the master record for every platform user.

Key Fields:

- id
- email
- password_hash
- first_name
- last_name
- role_id
- department_id
- is_active
- is_verified
- created_at
- updated_at

---

## roles

Defines system roles.

Examples:

- Student
- Faculty
- Admin
- Principal

Fields:

- id
- name
- description

---

## permissions

Stores all available system permissions.

Examples:

- create_problem
- review_project
- manage_users
- view_reports

Fields:

- id
- permission_name
- description

---

## role_permissions

Junction table connecting roles and permissions.

Relationship:

```
Role

↓

Role Permission

↓

Permission
```

---

## refresh_tokens

Stores active refresh tokens for authenticated sessions.

Fields:

- id
- user_id
- token_hash
- expires_at
- revoked_at
- created_at

---

## login_history

Maintains authentication audit logs.

Stores:

- user_id
- login_time
- logout_time
- ip_address
- device_information
- status

---

## Authentication Relationships

```text
Users
   │
   ▼
Roles
   │
   ▼
Role Permissions
   │
   ▼
Permissions

Users
   │
   ├───────────────┐
   │               │
   ▼               ▼
Refresh Tokens   Login History
```

The authentication schema provides secure identity management while supporting role-based access control, auditability, and future authentication enhancements.

# 8. User Tables

The User domain stores profile information and role-specific details beyond authentication.

---

## student_profiles

Stores student-specific information.

Fields:

- id
- user_id
- student_id
- department_id
- semester
- division
- admission_year
- graduation_year
- cgpa
- skills
- bio
- github_url
- linkedin_url
- resume_url
- created_at
- updated_at

---

## faculty_profiles

Stores faculty-specific information.

Fields:

- id
- user_id
- employee_id
- department_id
- designation
- specialization
- research_interests
- publications_count
- industry_experience
- office_location
- bio
- created_at
- updated_at

---

## admin_profiles

Stores administrator details.

Fields:

- id
- user_id
- designation
- responsibilities
- created_at
- updated_at

---

## principal_profiles

Stores institutional leadership information.

Fields:

- id
- user_id
- designation
- office
- created_at
- updated_at

---

## departments

Stores academic departments.

Fields:

- id
- department_name
- department_code
- hod_name
- created_at
- updated_at

---

# 9. Problem Tables

The Problem domain represents innovation opportunities published by faculty.

---

## problems

Stores every published problem statement.

Fields:

- id
- title
- description
- department_id
- created_by
- difficulty
- category
- status
- required_skills
- expected_team_size
- start_date
- end_date
- created_at
- updated_at

---

## problem_resources

Supporting files and links.

Fields:

- id
- problem_id
- resource_name
- resource_url
- resource_type

---

## problem_tags

Technology and category tags.

Fields:

- id
- problem_id
- tag_name

---

## problem_bookmarks

Students can bookmark interesting problems.

Fields:

- id
- problem_id
- student_id
- created_at

---

# 10. Team Tables

The Team domain manages collaboration.

---

## teams

Stores all project teams.

Fields:

- id
- problem_id
- leader_id
- team_name
- status
- created_at
- updated_at

---

## team_members

Maps students to teams.

Fields:

- id
- team_id
- student_id
- role
- joined_at

---

## team_invitations

Stores pending invitations.

Fields:

- id
- team_id
- invited_user_id
- invited_by
- status
- expires_at

---

## team_requests

Join requests submitted by students.

Fields:

- id
- team_id
- student_id
- status
- requested_at

---

# 11. Project Tables

Represents actual implementation of solutions.

---

## projects

Stores active and completed projects.

Fields:

- id
- team_id
- problem_id
- mentor_id
- title
- description
- status
- repository_url
- deployment_url
- documentation_url
- progress
- start_date
- completion_date
- created_at
- updated_at

---

## project_tasks

Task management.

Fields:

- id
- project_id
- assigned_to
- title
- status
- priority
- due_date

---

## project_files

Uploaded documents.

Fields:

- id
- project_id
- uploaded_by
- file_name
- file_url
- file_size
- uploaded_at

---

## project_milestones

Tracks project progress.

Fields:

- id
- project_id
- milestone_name
- description
- due_date
- completed

---

# 12. Review Tables

Faculty evaluation system.

---

## reviews

Stores faculty evaluations.

Fields:

- id
- project_id
- reviewer_id
- score
- feedback
- recommendation
- reviewed_at

---

## review_rubrics

Evaluation criteria.

Fields:

- id
- review_id
- criteria
- marks
- comments

---

## review_history

Stores review revisions.

Fields:

- id
- review_id
- modified_by
- modified_at
- change_summary

---

# 13. Credit Engine Tables

The Credit Engine is the single source of truth for contribution scoring.

---

## credit_transactions

Stores every credit event.

Fields:

- id
- user_id
- source
- source_id
- points
- transaction_type
- description
- created_at

---

## credit_rules

Defines scoring rules.

Fields:

- id
- activity
- points
- role
- is_active

---

## credit_history

Stores historical snapshots.

Fields:

- id
- user_id
- total_points
- calculated_at

---

# 14. Leaderboard Tables

The Leaderboard displays rankings generated from the Credit Engine.

---

## leaderboard_snapshots

Stores periodic ranking snapshots.

Fields:

- id
- user_id
- role
- department_id
- rank
- total_points
- snapshot_date

---

## leaderboard_history

Historical ranking data.

Fields:

- id
- snapshot_id
- previous_rank
- current_rank
- change_type

---

# 15. Portfolio Tables

Automatically generated portfolios.

---

## portfolio_entries

Stores verified achievements.

Fields:

- id
- user_id
- category
- title
- description
- source_type
- source_id
- visibility
- created_at

---

## portfolio_exports

Generated portfolio files.

Fields:

- id
- user_id
- export_type
- file_url
- generated_at

---

# 16. Notification Tables

Platform-wide notification system.

---

## notifications

Stores notifications.

Fields:

- id
- recipient_id
- title
- message
- notification_type
- is_read
- created_at

---

## notification_preferences

User notification settings.

Fields:

- id
- user_id
- email_enabled
- in_app_enabled
- push_enabled

---

# 17. Analytics Tables

Institutional reporting and metrics.

---

## analytics_snapshots

Stores platform statistics.

Fields:

- id
- snapshot_date
- active_users
- active_projects
- completed_projects
- total_problems
- total_reviews
- total_credits

---

## department_analytics

Department-level statistics.

Fields:

- id
- department_id
- innovation_score
- project_count
- publication_count
- faculty_score
- student_score

---

## user_activity_logs

Tracks important platform events.

Fields:

- id
- user_id
- activity
- module
- ip_address
- created_at

---

## Analytics Philosophy

Analytics should never be manually maintained.

Every metric should be generated automatically from verified platform activity, ensuring that dashboards, reports, and institutional insights always reflect accurate and trustworthy data.

# 18. Relationships

The database is designed around strong relational integrity. Every business entity is connected through well-defined foreign key relationships to ensure consistency, traceability, and scalability.

---

## High-Level Relationship Flow

```text
Department
    │
    ▼
Users
    │
    ├────────────────────────────┐
    │                            │
    ▼                            ▼
Student Profile            Faculty Profile
    │                            │
    └──────────────┬─────────────┘
                   ▼
               Problems
                   │
                   ▼
                 Teams
                   │
                   ▼
                Projects
                   │
                   ▼
                Reviews
                   │
                   ▼
         Credit Transactions
              │          │
              ▼          ▼
       Leaderboard   Portfolio
              │
              ▼
          Analytics
```

---

## Core Relationships

### Users

```
Department (1)
      │
      │
      ▼
Users (Many)
```

Each user belongs to one department.

---

### Problems

```
Faculty (1)

↓

Problems (Many)
```

One faculty member can publish multiple innovation problems.

---

### Teams

```
Problem (1)

↓

Teams (Many)
```

Multiple teams can work on the same problem.

---

### Team Members

```
Team (1)

↓

Team Members (Many)

↓

Student (1)
```

Many students belong to one team.

---

### Projects

```
Team (1)

↓

Project (1)
```

Each team owns one primary project.

---

### Reviews

```
Project (1)

↓

Reviews (Many)

↓

Faculty
```

Projects may undergo multiple reviews before completion.

---

### Credit Engine

```
Review

↓

Credit Transaction

↓

User
```

Every credit transaction originates from a verified platform event.

---

### Portfolio

```
Credit Transaction

↓

Portfolio Entry
```

Portfolio entries are generated automatically.

---

### Leaderboard

```
Credit Transactions

↓

Leaderboard Snapshot
```

Leaderboard rankings are derived entirely from verified credit transactions.

---

### Notifications

Notifications may reference:

- Problems
- Teams
- Projects
- Reviews
- Credits
- Announcements

---

## Relationship Rules

- No orphan records.
- All foreign keys must be enforced.
- Cascading deletes should be used cautiously.
- Critical data should use soft deletes instead of hard deletes.
- Business logic must never bypass foreign key constraints.

---

# 19. Constraints

To maintain data integrity, the following constraints apply.

---

## Primary Keys

Every table must contain:

```
id
```

as its primary key.

---

## Foreign Keys

Relationships must be enforced using foreign key constraints.

Examples:

```
project.team_id

→ teams.id

review.project_id

→ projects.id

student_profile.user_id

→ users.id
```

---

## Unique Constraints

The following fields should be unique where applicable:

- Email
- Student ID
- Employee ID
- Department Code
- Role Name
- Permission Name

---

## NOT NULL Constraints

Mandatory fields include:

- Email
- Password Hash
- User Role
- Problem Title
- Project Status
- Review Score
- Credit Points

---

## Check Constraints

Examples:

CGPA

```
0 ≤ cgpa ≤ 10
```

Review Score

```
0 ≤ score ≤ 100
```

Credit Points

```
points >= 0
```

Semester

```
1 ≤ semester ≤ 8
```

---

## Default Values

Examples:

```
created_at = CURRENT_TIMESTAMP

updated_at = CURRENT_TIMESTAMP

is_active = true

is_verified = false

status = 'pending'
```

---

## Soft Delete Policy

Critical business entities should include:

```
deleted_at

deleted_by
```

instead of permanent deletion.

Applicable tables include:

- Users
- Problems
- Projects
- Reviews

---

## Audit Columns

Every important business table should contain:

```
created_at

updated_at

created_by

updated_by
```

This enables traceability and accountability.

---

# 20. Indexing Strategy

Indexes should be created to improve query performance while avoiding unnecessary overhead.

---

## Primary Indexes

Automatically created for:

- Primary Keys
- Unique Constraints

---

## Frequently Indexed Columns

Users

- email
- role_id
- department_id

Problems

- status
- department_id
- created_by
- category

Projects

- team_id
- mentor_id
- status

Reviews

- project_id
- reviewer_id

Credits

- user_id
- created_at

Leaderboard

- rank
- department_id
- total_points

Portfolio

- user_id

Notifications

- recipient_id
- is_read

Analytics

- snapshot_date

---

## Composite Indexes

Where appropriate:

```
(department_id, status)

(user_id, created_at)

(problem_id, status)

(project_id, reviewer_id)

(role_id, department_id)
```

---

## Full Text Search

Future versions may support PostgreSQL Full Text Search for:

- Problem Titles
- Problem Descriptions
- Project Titles
- Portfolio Entries

---

## Performance Guidelines

Avoid:

- Duplicate indexes
- Indexing low-selectivity columns
- Excessive composite indexes

Indexes should be introduced based on real query patterns and performance metrics.

---

# 21. Future Tables

The database is designed to support future expansion without requiring major structural changes.

The following tables may be introduced in future versions.

---

## AI Module

- ai_recommendations
- ai_project_scores
- ai_feedback

---

## Startup Incubator

- startups
- startup_members
- funding_rounds
- investors

---

## Internship Portal

- internships
- internship_applications
- employer_profiles

---

## Placement Portal

- companies
- placement_drives
- interview_results

---

## Patent Management

- patents
- patent_contributors
- patent_reviews

---

## Alumni Network

- alumni_profiles
- mentorship_sessions
- alumni_projects

---

## Industry Collaboration

- organizations
- industry_projects
- collaboration_agreements

---

## Multi-College Support

- institutions
- campuses
- institution_admins

---

## Mobile Application

No additional schema changes are anticipated. The existing REST API and database design are intended to support both web and mobile clients.

---

## Versioning Strategy

Future schema changes must:

- Use Alembic migrations.
- Preserve backward compatibility whenever possible.
- Avoid destructive changes.
- Include rollback scripts.
- Update documentation before deployment.

---

## Final Database Principles

The CRCE OS database is designed to be:

- Normalized
- Secure
- Scalable
- Maintainable
- Auditable
- High Performance
- Extensible

Every schema modification should preserve these principles.

The database is the foundation of the Campus Operating System. All application features should build upon a clean, well-structured, and consistent data model rather than introducing isolated or redundant data structures.


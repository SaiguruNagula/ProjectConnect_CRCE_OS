# 07_API_SPEC.md

# 1. Document Information

| Item | Details |
|------|---------|
| Document | API Specification |
| Product | CRCE OS (Campus Operating System) |
| Version | 1.0 |
| Status | Active |
| API Style | REST |
| Base URL | /api/v1 |
| Authentication | JWT + Refresh Tokens |
| Data Format | JSON |
| Owner | CRCE OS Backend Team |

---

## Purpose

This document defines the complete REST API contract for CRCE OS.

It acts as the single source of truth between the frontend and backend.

It specifies:

- API Standards
- Endpoints
- Request Structure
- Response Structure
- Authentication
- Authorization
- Error Handling
- Versioning
- Best Practices

All APIs must follow this specification.

---

# 2. API Philosophy

The API layer is the communication bridge between the frontend and backend.

It should be:

- Predictable
- Consistent
- Secure
- Stateless
- Versioned
- Easy to consume
- Well documented
- Easy to maintain

---

## API Design Principles

### REST First

Version 1.0 follows RESTful architecture.

Every resource has its own endpoint.

Example:

```
/api/v1/projects
/api/v1/problems
/api/v1/reviews
```

---

### Resource Based

Endpoints represent resources.

Good

```
GET /projects
POST /projects
PUT /projects/{id}
DELETE /projects/{id}
```

Avoid

```
/createProject

/getAllProjects

/deleteProblem
```

---

### Stateless

Every request contains all information required to process it.

The server never stores user sessions.

Authentication is handled through JWT access tokens and refresh tokens.

---

### Consistency

All APIs should use:

- Same naming convention
- Same response structure
- Same error format
- Same authentication method

A developer should be able to predict the behavior of every endpoint.

---

### Single Responsibility

Each endpoint should perform one business operation only.

Examples:

```
Create Problem

Submit Review

Join Team

Generate Portfolio
```

Avoid endpoints that perform multiple unrelated actions.

---

### Secure by Default

Every protected endpoint must verify:

Authentication

↓

Authorization

↓

Permission

↓

Ownership (if applicable)

---

### Future Ready

The API should support future clients including:

- Web Application
- Mobile Application
- Admin Dashboard
- External Integrations
- AI Services

without major redesign.

---

# 3. Standards

## Base URL

```
/api/v1
```

All endpoints must begin with the API version.

Examples

```
/api/v1/problems

/api/v1/projects

/api/v1/leaderboard
```

---

## Data Format

All requests and responses use JSON.

Request

```json
{
  "title": "Smart Attendance System",
  "description": "AI powered attendance solution."
}
```

---

## Standard Success Response

Every successful response follows:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

---

## Standard Error Response

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "title",
      "message": "Title is required."
    }
  ]
}
```

---

## HTTP Status Codes

| Code | Meaning |
|-------|----------|
| 200 | Success |
| 201 | Resource Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

Always use standard HTTP status codes.

---

## Request Validation

Every incoming request must be validated using Pydantic schemas.

Validation includes:

- Required Fields
- Data Types
- Length Constraints
- Value Ranges
- Enums
- Business Rules

---

## API Naming

Resources use plural nouns.

Examples

```
/users

/projects

/problems

/credits

/reviews
```

---

## Date Format

Use ISO 8601.

Example

```
2026-07-09T14:30:00Z
```

---

## UUID Support

Public APIs may expose UUIDs where appropriate.

Internal database IDs remain implementation details.

---

## Idempotency

PUT and DELETE operations should be idempotent.

Repeated requests should not create inconsistent state.

---

# 4. Authentication APIs

Authentication APIs manage user identity, access control, and session lifecycle.

---

## Login

```
POST /api/v1/auth/login
```

Purpose

Authenticate a user and return access credentials.

Request

```json
{
  "email": "student@crce.edu",
  "password": "********"
}
```

Response

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {}
}
```

---

## Refresh Token

```
POST /api/v1/auth/refresh
```

Generates a new access token using a valid refresh token.

---

## Logout

```
POST /api/v1/auth/logout
```

Invalidates the refresh token and ends the session.

---

## Current User

```
GET /api/v1/auth/me
```

Returns the authenticated user's profile.

---

## Change Password

```
PUT /api/v1/auth/change-password
```

Allows users to update their password after authentication.

---

## Forgot Password

```
POST /api/v1/auth/forgot-password
```

Sends a password reset link or token.

---

## Reset Password

```
POST /api/v1/auth/reset-password
```

Completes the password reset process.

---

## Authentication Flow

```text
Login
   │
   ▼
JWT Access Token
   │
   ▼
Protected API Request
   │
   ▼
Authorization Middleware
   │
   ▼
Business Logic
```

Authentication is stateless and enforced on every protected endpoint.

---

# 5. User APIs

User APIs manage user profiles and account information.

---

## Get Current User

```
GET /api/v1/users/me
```

Returns complete profile information for the authenticated user.

---

## Get User Profile

```
GET /api/v1/users/{id}
```

Returns public profile information.

---

## Update Profile

```
PUT /api/v1/users/{id}
```

Updates editable profile fields.

Examples:

- Bio
- Skills
- Profile Picture
- Social Links

---

## Upload Avatar

```
POST /api/v1/users/avatar
```

Uploads a profile picture.

---

## Search Users

```
GET /api/v1/users
```

Supports filters such as:

- Name
- Department
- Role
- Skills

---

## Get Faculty

```
GET /api/v1/users/faculty
```

Returns faculty members available for mentorship.

---

## Get Students

```
GET /api/v1/users/students
```

Returns student records based on permissions.

---

## User API Permissions

Students

- View own profile
- Update own profile

Faculty

- View assigned students
- Update own profile

Admin

- View all users
- Update users
- Disable users

Principal

- Read-only institutional access

---

# 6. Problem APIs

Problem APIs power the Innovation Hub.

They manage the complete lifecycle of institutional problems.

---

## List Problems

```
GET /api/v1/problems
```

Supports:

- Search
- Department Filter
- Difficulty Filter
- Category Filter
- Status Filter
- Pagination

---

## Get Problem

```
GET /api/v1/problems/{id}
```

Returns complete problem details.

---

## Create Problem

```
POST /api/v1/problems
```

Permission

Faculty Only

Creates a new innovation challenge.

---

## Update Problem

```
PUT /api/v1/problems/{id}
```

Permission

Problem Owner or Admin

---

## Delete Problem

```
DELETE /api/v1/problems/{id}
```

Soft delete only.

---

## Bookmark Problem

```
POST /api/v1/problems/{id}/bookmark
```

Allows students to save problems.

---

## Remove Bookmark

```
DELETE /api/v1/problems/{id}/bookmark
```

---

## Get Problem Teams

```
GET /api/v1/problems/{id}/teams
```

Returns all teams working on a problem.

---

## Upload Resources

```
POST /api/v1/problems/{id}/resources
```

Allows faculty to attach supporting documents.

---

## Problem Lifecycle

```text
Faculty Creates Problem
        │
        ▼
Innovation Hub
        │
        ▼
Open Problems
        │
        ▼
Students Discover
        │
        ▼
Team Formation
        │
        ▼
Project Development
```

The Problem APIs are the starting point of the entire CRCE OS innovation lifecycle.

# 7. Team APIs

The Team APIs manage team formation, invitations, collaboration, and membership throughout the project lifecycle.

---

## Create Team

```http
POST /api/v1/teams
```

Permission

Student

Creates a new project team for a selected problem.

---

## Get Team

```http
GET /api/v1/teams/{id}
```

Returns complete team information.

---

## Update Team

```http
PUT /api/v1/teams/{id}
```

Team leader can modify:

- Team Name
- Description
- Required Skills
- Recruitment Status

---

## Invite Member

```http
POST /api/v1/teams/{id}/invite
```

Invites a student to join.

---

## Accept Invitation

```http
POST /api/v1/teams/invitations/{id}/accept
```

---

## Reject Invitation

```http
POST /api/v1/teams/invitations/{id}/reject
```

---

## Request to Join

```http
POST /api/v1/teams/{id}/join
```

Students request access to a team.

---

## Leave Team

```http
DELETE /api/v1/teams/{id}/leave
```

---

## Remove Member

```http
DELETE /api/v1/teams/{id}/members/{userId}
```

Team Leader only.

---

## Team Lifecycle

```
Problem

↓

Create Team

↓

Invite Members

↓

Accept Invitations

↓

Team Complete

↓

Project Starts
```

---

# 8. Project APIs

Project APIs manage the development lifecycle.

---

## Create Project

```http
POST /api/v1/projects
```

Creates a project after team confirmation.

---

## Get Project

```http
GET /api/v1/projects/{id}
```

Returns project details.

---

## Update Project

```http
PUT /api/v1/projects/{id}
```

Updates:

- Description
- Repository
- Documentation
- Demo Link
- Progress

---

## Upload Project File

```http
POST /api/v1/projects/{id}/files
```

---

## Add Milestone

```http
POST /api/v1/projects/{id}/milestones
```

---

## Update Milestone

```http
PUT /api/v1/projects/{id}/milestones/{id}
```

---

## Complete Project

```http
POST /api/v1/projects/{id}/complete
```

Marks project ready for review.

---

## Project Lifecycle

```
Team

↓

Project

↓

Development

↓

Submission

↓

Faculty Review

↓

Completed
```

---

# 9. Review APIs

Review APIs power the Faculty Review Engine.

---

## Submit Review

```http
POST /api/v1/reviews
```

Faculty evaluates project.

---

## Get Review

```http
GET /api/v1/reviews/{id}
```

---

## Update Review

```http
PUT /api/v1/reviews/{id}
```

---

## Review History

```http
GET /api/v1/reviews/{id}/history
```

---

## Approve Project

```http
POST /api/v1/reviews/{id}/approve
```

Triggers

```
Review

↓

Credit Engine

↓

Leaderboard

↓

Portfolio
```

---

## Reject Project

```http
POST /api/v1/reviews/{id}/reject
```

Returns project for improvement.

---

# 10. Credit APIs

The Credit Engine is the only scoring authority.

No module calculates credits independently.

---

## Get Credits

```http
GET /api/v1/credits/me
```

---

## Credit History

```http
GET /api/v1/credits/history
```

---

## Credit Rules

```http
GET /api/v1/credits/rules
```

---

## Recalculate Credits

```http
POST /api/v1/credits/recalculate
```

Admin Only.

---

## Credit Sources

Credits originate from:

- Projects
- Reviews
- Mentorship
- Research
- Innovation
- Hackathons
- Publications

---

# 11. Leaderboard APIs

Leaderboard data is read-only.

Scores always come from the Credit Engine.

---

## Global Leaderboard

```http
GET /api/v1/leaderboard
```

---

## Student Leaderboard

```http
GET /api/v1/leaderboard/students
```

---

## Faculty Leaderboard

```http
GET /api/v1/leaderboard/faculty
```

---

## Department Leaderboard

```http
GET /api/v1/leaderboard/departments
```

---

## User Rank

```http
GET /api/v1/leaderboard/me
```

---

## Leaderboard Rules

- Read Only
- No Manual Editing
- Generated Automatically
- Uses Credit Engine
- Updates after verified events

---

# 12. Portfolio APIs

Portfolios showcase verified contributions.

---

## My Portfolio

```http
GET /api/v1/portfolio/me
```

---

## Public Portfolio

```http
GET /api/v1/portfolio/{userId}
```

---

## Export Portfolio

```http
POST /api/v1/portfolio/export
```

Supported

- PDF
- JSON

---

## Portfolio Timeline

```http
GET /api/v1/portfolio/timeline
```

---

## Portfolio Rules

Users cannot manually add verified achievements.

Everything originates from platform activity.

---

# 13. Notification APIs

Notification APIs manage communication.

---

## Get Notifications

```http
GET /api/v1/notifications
```

---

## Mark as Read

```http
PUT /api/v1/notifications/{id}/read
```

---

## Mark All Read

```http
PUT /api/v1/notifications/read-all
```

---

## Notification Preferences

```http
PUT /api/v1/notifications/preferences
```

---

## Notification Categories

- Team
- Project
- Review
- Credits
- Leaderboard
- System
- Admin
- Announcement

---

# 14. Analytics APIs

Analytics APIs provide institutional insights.

---

## Dashboard Analytics

```http
GET /api/v1/analytics/dashboard
```

---

## Department Analytics

```http
GET /api/v1/analytics/departments
```

---

## Student Analytics

```http
GET /api/v1/analytics/students
```

---

## Faculty Analytics

```http
GET /api/v1/analytics/faculty
```

---

## Export Analytics

```http
POST /api/v1/analytics/export
```

---

# 15. Admin APIs

Administrative operations.

---

## Manage Users

```
GET    /api/v1/admin/users
POST   /api/v1/admin/users
PUT    /api/v1/admin/users/{id}
DELETE /api/v1/admin/users/{id}
```

---

## Manage Problems

```
GET /api/v1/admin/problems
```

---

## Manage Projects

```
GET /api/v1/admin/projects
```

---

## Manage Reviews

```
GET /api/v1/admin/reviews
```

---

## Manage Credits

```
GET /api/v1/admin/credits
```

---

## Reports

```
GET /api/v1/admin/reports
```

---

## System Health

```
GET /api/v1/admin/system
```

---

# 16. Principal APIs

Principal APIs provide institution-level visibility.

The Principal has read-only access to institutional data.

---

## Institution Dashboard

```http
GET /api/v1/principal/dashboard
```

---

## Innovation Report

```http
GET /api/v1/principal/innovation
```

---

## Department Performance

```http
GET /api/v1/principal/departments
```

---

## Faculty Performance

```http
GET /api/v1/principal/faculty
```

---

## Student Performance

```http
GET /api/v1/principal/students
```

---

## Leaderboard Summary

```http
GET /api/v1/principal/leaderboard
```

---

## Portfolio Highlights

```http
GET /api/v1/principal/portfolios
```

---

## Export Reports

```http
POST /api/v1/principal/export
```

Supported formats:

- PDF
- Excel
- CSV

---

## Principal Permissions

The Principal may:

- View Institution Analytics
- View All Departments
- View Leaderboards
- View Portfolios
- View Innovation Statistics
- Export Reports

The Principal cannot modify operational data such as users, projects, reviews, or credits. This preserves governance while providing complete institutional oversight.

# 17. Error Responses

CRCE OS follows a standardized error response format across every API.

This ensures predictable frontend behavior, easier debugging, and a consistent developer experience.

---

## Standard Error Response

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Email is required."
    }
  ]
}
```

---

## Standard Error Fields

| Field | Description |
|--------|-------------|
| success | Always false |
| message | Human-readable summary |
| errors | List of validation or business errors |
| error_code | Optional internal application code |
| timestamp | Time the error occurred |
| path | Requested endpoint |

---

## HTTP Status Codes

| Code | Meaning | Usage |
|------|----------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 204 | No Content | Successful deletion/update |
| 400 | Bad Request | Invalid request |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Permission denied |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate or conflicting resource |
| 422 | Validation Error | Input validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

---

## Error Categories

### Validation Errors

Examples:

- Missing fields
- Invalid data types
- Invalid email format
- Invalid file upload

---

### Authentication Errors

Examples:

- Invalid credentials
- Expired JWT
- Missing token
- Invalid refresh token

---

### Authorization Errors

Examples:

- Student accessing faculty endpoint
- Faculty accessing admin endpoint
- Insufficient permissions

---

### Business Logic Errors

Examples:

- Team already full
- Student already joined another team
- Problem already closed
- Review already submitted

---

### Server Errors

Unexpected exceptions should:

- Return HTTP 500
- Log the complete error internally
- Never expose stack traces or sensitive information to the client

---

## Error Handling Principles

- Use meaningful error messages.
- Never expose internal implementation details.
- Always return consistent response structures.
- Log errors for monitoring and debugging.
- Prefer specific HTTP status codes over generic ones.

---

# 18. Pagination

All APIs returning collections must support pagination to ensure scalability and efficient data transfer.

---

## Standard Query Parameters

```http
?page=1
&limit=20
```

Optional parameters:

```http
sort=name
order=asc
search=attendance
filter=active
```

---

## Standard Paginated Response

```json
{
  "success": true,
  "message": "Records retrieved successfully.",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 135,
      "total_pages": 7,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

---

## Default Pagination Rules

| Setting | Value |
|----------|-------|
| Default Page | 1 |
| Default Limit | 20 |
| Maximum Limit | 100 |

---

## APIs Requiring Pagination

- Users
- Problems
- Teams
- Projects
- Reviews
- Notifications
- Leaderboards
- Portfolio Entries
- Analytics Reports

---

## Sorting

Supported:

```http
sort=created_at

sort=credits

sort=rank

sort=name
```

---

## Filtering

Examples:

```
department=AIDS

status=ACTIVE

semester=6

role=Faculty

difficulty=Hard
```

---

## Search

Search should support partial matching where appropriate.

Examples:

```
search=AI

search=attendance

search=healthcare
```

---

# 19. Rate Limiting

Rate limiting protects the platform from abuse while ensuring fair usage for all users.

---

## General Policy

Rate limits are applied per authenticated user or client IP (for public endpoints).

---

## Default Limits

| API Category | Limit |
|--------------|-------|
| Authentication | 5 requests/minute |
| Public APIs | 100 requests/minute |
| Authenticated APIs | 300 requests/minute |
| File Upload APIs | 20 requests/minute |
| Export APIs | 10 requests/minute |
| Admin APIs | 200 requests/minute |

---

## Rate Limit Response

When exceeded:

```http
HTTP 429
```

```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later."
}
```

---

## Exemptions

Internal services may bypass rate limits where appropriate.

Examples:

- Scheduled jobs
- Background workers
- Internal system integrations

---

## Abuse Prevention

The system should monitor:

- Repeated failed logins
- Excessive API usage
- Large numbers of file uploads
- Automated scraping attempts

Repeated abuse may result in temporary account suspension or IP blocking.

---

# 20. API Versioning

CRCE OS uses URL-based API versioning to maintain backward compatibility while allowing future evolution.

---

## Current Version

```
/api/v1
```

Examples:

```http
GET /api/v1/problems

GET /api/v1/projects

GET /api/v1/leaderboard
```

---

## Future Versions

Future releases may introduce:

```
/api/v2

/api/v3
```

Older versions should remain supported during migration whenever practical.

---

## Versioning Principles

- Never introduce breaking changes within the same API version.
- New features should be backward compatible.
- Deprecate endpoints before removing them.
- Document all changes in release notes.

---

## API Documentation

Every endpoint must be documented through FastAPI's automatically generated OpenAPI specification.

Documentation should include:

- Endpoint
- Description
- Request Body
- Response Schema
- Authentication Requirements
- Permissions
- Validation Rules
- Example Requests
- Example Responses
- Possible Error Responses

---

## API Lifecycle

Every API should follow the same lifecycle:

```text
Design

↓

Review

↓

Implementation

↓

Testing

↓

Documentation

↓

Deployment

↓

Monitoring

↓

Maintenance
```

---

## Final API Principles

Every API developed for CRCE OS must adhere to the following principles:

- RESTful by design
- Stateless
- Secure by default
- Fully versioned
- Well documented
- Predictable and consistent
- Strongly validated
- Role-based access controlled
- Optimized for performance
- Easy to maintain and extend

The API is the contract between the frontend and backend. Once published, it should remain stable, reliable, and backward compatible, ensuring that CRCE OS can evolve without disrupting existing clients or integrations.

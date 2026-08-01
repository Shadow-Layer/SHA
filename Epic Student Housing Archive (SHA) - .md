# Epic: Student Housing Archive (SHA) - Empowering Student Housing Transparency

---

# T9 — In-App Notifications

## Purpose
Implement the in-app notification system — the mechanism that keeps students and landlords informed of key events without requiring email.

## Scope

### Notification Bell (Nav Component)
- Bell icon in the nav bar for authenticated users
- Unread count badge (red dot with number) — fetched on page load via `GET /api/notifications?unreadOnly=true`
- Clicking the bell opens a dropdown showing the 10 most recent notifications
- Each notification shows: message text, time ago, unread indicator
- Clicking a notification → marks it as read (`PATCH /api/notifications/[id]`) + navigates to the relevant page

### Notification Creation (Server-Side)
Notifications are created as side effects in the relevant Route Handlers:

| Trigger | Recipient | Message |
|---|---|---|
| Student submits application | Landlord | "New application for [Listing Title] from [Student Name]" |
| Landlord accepts application | Student | "Your application for [Listing Title] was accepted. Check your inbox." |
| Landlord rejects application | Student | "Your application for [Listing Title] was not accepted." |
| Admin approves listing | Landlord | "Your listing [Listing Title] is now live." |

### API Routes
- `GET /api/notifications` — returns notifications for current user, sorted by `createdAt` desc, optional `?unreadOnly=true`
- `PATCH /api/notifications/[id]` — marks notification as read (user must own the notification)

## Out of Scope
- Email notifications (post-MVP)
- Push notifications
- "Mark all as read" bulk action (can be added as a small enhancement)

## Acceptance Criteria
- Bell icon shows correct unread count after each triggering event
- All 4 notification types are created at the correct moment
- Clicking a notification marks it read and navigates correctly
- Notifications are user-scoped (user cannot see another user's notifications)

## Spec References
- `spec:9472fb91-1eb2-47dd-b8ad-213b504c3c73/7df00cb2-e98f-4a0c-bdc1-02c9619bf3a8` — In-App Notifications section, notifications schema
- `spec:9472fb91-1eb2-47dd-b8ad-213b504c3c73/dc85f3f3-f98e-4550-af75-3682b814f847` — Flow 6 (notification on accept/reject)

## Dependencies
- T1 (schemas), T2 (auth), T6 (application events that trigger notifications), T5 (listing approval event)

# Epic: Student Housing Archive (SHA) - Empowering Student Housing Transparency

---

# T10 — Admin Panel

## Purpose
Build the admin moderation interface — the control layer that maintains platform quality and trust.

## Scope

### Admin Route Protection
- All `/admin/*` routes check `role === 'admin'` server-side
- Non-admin users redirected to `/dashboard`
- Admin nav: Admin Panel link visible only when `role === 'admin'`

### Listing Approval Queue (`/admin/listings`)
- Table of all `pending_review` listings, sorted by `createdAt` asc (oldest first)
- Each row shows: listing title, area, landlord name, submitted date, photo count
- Actions per row:
  - **Approve** → sets `status: 'published'`, `verificationLevel: 'landlord_confirmed'`, creates notification for landlord
  - **Reject** → sets `status: 'removed'`, creates notification for landlord (optional rejection note)
- Filter tabs: Pending Review · Published · Warning · Removed
- Clicking a listing title → opens listing detail in a new tab

### Reports Queue (`/admin/reports`)
- Table of all `pending` reports, sorted by `createdAt` asc
- Each row shows: target type (listing/post/comment), target preview, reporter, reason, date
- Actions per row:
  - **Resolve** → sets report `status: 'resolved'` (no action taken on target)
  - **Remove target** → sets report `status: 'resolved'` + sets target `status: 'removed'`
  - For listing reports: additional option to **Clear Warning** → sets listing `status: 'published'`

### API Routes
- `GET /api/admin/listings` — admin only, returns listings filtered by status
- `PATCH /api/admin/listings/[id]` — admin only, approve/reject listing
- `GET /api/admin/reports` — admin only, returns pending reports with target details
- `PATCH /api/admin/reports/[id]` — admin only, resolve or remove target

## Out of Scope
- User management / suspension UI (can be added post-MVP via direct DB access)
- Analytics dashboard
- Bulk actions

## Acceptance Criteria
- Non-admin users cannot access any `/admin` route
- Approving a listing sets it to `published` and notifies the landlord
- Rejecting a listing sets it to `removed`
- Resolving a report marks it resolved without affecting the target
- "Remove target" removes the target content
- "Clear Warning" restores a listing from `warning` to `published`
- Warning listings appear in the Reports queue (auto-created in T7)

## Spec References
- `spec:9472fb91-1eb2-47dd-b8ad-213b504c3c73/dc85f3f3-f98e-4550-af75-3682b814f847` — Flow 3 (admin clears/confirms warning), Flow 5 (admin approves listing)
- `spec:9472fb91-1eb2-47dd-b8ad-213b504c3c73/7df00cb2-e98f-4a0c-bdc1-02c9619bf3a8` — Component Architecture (Admin Panel), reports schema

## Dependencies
- T1 (schemas), T2 (auth + admin role), T5 (listings to approve), T7 (warning reports to resolve)

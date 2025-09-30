# Multi-Tenant Task Manager - Frontend

### Deployment Link
https://multi-tenant-frontend-opal.vercel.app/

A Next.js-based frontend for a multi-tenant task management system. Each organization gets its own isolated workspace with real-time activity tracking.

## Running Locally

1. **Install dependencies**
   ```sh
   npm install
   ```

2. **Set up environment variables**
   
   Create a `.env.local` file in the frontend directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

3. **Start the dev server**
   ```sh
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000`

4. **Build for production**
   ```sh
   npm run build
   npm start
   ```

## How Multi-Tenancy Works

The app is built around organizations - each organization is a completely separate tenant with its own data, users, and permissions.

### URL-Based Tenancy
The organization context is determined by the URL structure:
```
/organizations/[organizationId]/...
```

Every route (except login/register) includes the `organizationId` in the URL. This means:
- No global state needed for the current organization
- Easy to switch between organizations (just navigate to a different URL)
- URL sharing works perfectly - the link contains all the context needed

### How It's Built

1. **Organization Selection**
   - After login, you see a list of organizations you're a member of
   - Clicking one takes you to `/organizations/[organizationId]`
   - The organization ID is then available in every nested route via Next.js params

2. **Route Protection**
   - The backend checks organization membership on every API call
   - PostgreSQL Row Level Security (RLS) ensures users can only access data from organizations they belong to
   - If you try to access an organization you're not part of, you get a 403

3. **Organization Switching**
   - Click the organization name in the header to go back to the organization list
   - No need to logout - just select a different organization

## How Authentication Works

We use a dual-token approach: access tokens for API calls and refresh tokens for getting new access tokens.

### The Flow

1. **Login/Register**
   - User enters credentials
   - Backend validates and sends back:
     - Access token (15 min expiry) in the response body
     - Refresh token (7 days expiry) as an HTTP-only cookie
   - Frontend stores access token in memory via `TokenContext`

2. **Making API Calls**
   - Every API request automatically includes the access token in the `Authorization` header
   - This happens via an Axios interceptor in `services/api.ts`
   - The backend verifies the token and extracts the user ID

3. **Token Refresh**
   - When the access token expires, the next API call gets a 401
   - The Axios interceptor catches this and calls `/auth/refresh`
   - The refresh token (in the cookie) is automatically sent
   - Backend returns a new access token
   - The original request is retried with the new token
   - This happens seamlessly - the user never notices

4. **Why HTTP-Only Cookies for Refresh Tokens?**
   - JavaScript can't access them (prevents XSS attacks)
   - Browser sends them automatically with requests
   - More secure than localStorage

### The Code

**Token Storage** (`utils/tokenStore.ts`)
- Singleton class that holds the access token in memory
- Handles token refresh logic
- Notifies subscribers when the token changes

**Token Context** (`contexts/TokenContext.tsx`)
- React Context that wraps the entire app
- Initializes by trying to refresh the token on mount
- Provides `token` and `setToken` to all components

**API Service** (`services/api.ts`)
- Axios instance with interceptors
- Request interceptor: adds access token to headers
- Response interceptor: handles 401s and refreshes tokens

## How the Activity Feed Works

Real-time activity tracking using WebSockets and PostgreSQL.

### What Gets Tracked
- Task creation, updates, status changes, assignments
- Project creation and deletion
- Organization member additions/removals

### The Architecture

1. **Creating Activities**
   - When something happens (e.g., task created), the backend calls `ActivityService.logActivity()`
   - This saves the activity to PostgreSQL
   - Then broadcasts it via WebSocket to everyone in that organization's room

2. **WebSocket Rooms**
   - Each organization has a unique room (using the organization's subdomain as the room key)
   - When you view an organization, the frontend joins that room
   - Any activity in that organization is broadcast to all connected clients in the room

3. **Frontend Display**
   - The `ActivityFeed` component fetches initial activities from the API (paginated)
   - Connects to the WebSocket server and joins the organization's room
   - Listens for new activities via the `newActivity` event
   - Prepends new activities to the list in real-time

4. **Why PostgreSQL Instead of Redis?**
   - Activities need to persist (users want to see history)
   - PostgreSQL gives us proper querying (filter by type, pagination, etc.)
   - WebSocket still provides the real-time broadcast

## How Ownership and Permissions Work

The app has a role-based system where the person who creates something becomes the owner. Permissions cascade down from organizations to projects to tasks.

### The Hierarchy

```
User
 └─> Organization (as OWNER, ADMIN, or MEMBER)
      └─> Projects
           └─> Tasks
```

### Organization Ownership

When you create an organization, you automatically become the **OWNER**:
- **What owners can do:**
  - Everything (full control)
  - Invite/remove members
  - Access organization settings
  - Delete the organization
  - Create/delete projects
  - Create/edit/delete tasks

- **What admins can do:**
  - Invite/remove members (but can't remove the owner)
  - Create/delete projects
  - Create/edit/delete tasks
  - Can't delete the organization

- **What regular members can do:**
  - View organization data
  - Create tasks
  - Edit tasks (if they created them or are assigned)
  - Can't invite/remove people
  - Can't delete projects

### How It Works in Practice

1. **Creating an Organization**
   ```
   User clicks "Create Organization"
   → Backend creates the organization
   → Backend creates an org_membership record with role = "OWNER"
   → User now owns this organization
   ```

2. **Inviting Members**
   ```
   Owner/Admin goes to /organizations/[id]/settings
   → Clicks "Invite Member"
   → Selects a user and assigns a role (ADMIN or MEMBER)
   → Backend creates an org_membership record
   → That user can now access the organization
   ```

3. **Creating Projects**
   ```
   Any member can create a project
   → Frontend sends POST /api/organizations/[id]/projects
   → Backend checks: "Is this user a member of this organization?"
   → If yes, project is created and scoped to that organization
   → All organization members can see it
   ```

4. **Creating Tasks**
   ```
   Any member creates a task in a project
   → Frontend sends POST /api/organizations/[id]/projects/[projectId]/tasks
   → Backend checks: "Does this user have access to this project?"
   → If yes, task is created
   → Task creator can edit/delete it
   → Assigned user can also edit it
   ```

5. **Accessing Settings**
   ```
   User navigates to /organizations/[id]/settings
   → Frontend shows the page
   → Backend checks user role on API calls
   → If OWNER/ADMIN: can manage members
   → If MEMBER: gets 403 Forbidden
   ```

### Database Level Security

The backend uses PostgreSQL Row Level Security (RLS) to enforce these rules at the database level:

- **RLS policies** ensure users can only query data from organizations they're members of
- Even if you somehow bypassed the API, the database would block you
- Every query automatically filters by organization membership

Example: When you fetch tasks, the database runs:
```sql
SELECT * FROM tasks 
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE organization_id IN (
    SELECT organization_id FROM org_memberships 
    WHERE user_id = current_user
  )
)
```

### Settings Page

The settings page (`/organizations/[organizationId]/settings`) is where owners and admins manage the organization:

**What you can do:**
- View all organization members and their roles
- Invite new members (search by username/email, assign role)
- Remove members (owners can remove anyone, admins can't remove owners)
- View organization details (name, subdomain, created date)

**Role restrictions:**
- Members can't access this page at all
- Admins can manage members but can't delete the organization
- Owners have full control

**How member management works:**
1. Click "Invite Member" button
2. Enter their username or email
3. Select their role (ADMIN or MEMBER)
4. Backend creates the org_membership
5. They can now access the organization

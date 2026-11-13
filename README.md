# Backend Documentation

## Overview

The backend is a REST API for **Note & Activity Tracker**. It uses Node.js, Express, MongoDB, and Mongoose. JWT bearer tokens authenticate private operations, while roles distinguish regular users from administrators.

The API is mounted at `/api`. During local development, the default port is `5000`.

## Technology

- Node.js and Express
- MongoDB with Mongoose models and aggregation pipelines
- JSON Web Tokens (`jsonwebtoken`)
- `bcryptjs` password hashing
- CORS and JSON request parsing

## Requirements

- Node.js 18 or newer
- npm
- MongoDB, either local or MongoDB Atlas

## Installation and configuration

From the project root:

```sh
cd backend
npm install
```

Copy `.env.example` to `.env` and set values for the local environment:

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/notes_task
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-unique-strong-password
```

Use a unique, high-entropy `JWT_SECRET` and a strong admin password. Do not commit `.env` or use example credentials on a public deployment. `JWT_EXPIRES_IN` accepts a value understood by `jsonwebtoken`; it defaults to `1d`.

Create the initial administrator and synchronize the model indexes:

```sh
npm run seed:admin
```

Start the API:

```sh
npm run dev
```

For production, use:

```sh
npm start
```

`GET /` is a liveness endpoint and returns `{ "status": "ok" }`. Use `GET /health` to verify MongoDB connectivity; it returns `{ "status": "ok", "database": "connected" }` only after connecting. API routes await a shared MongoDB connection before accessing models, which also supports serverless cold starts.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the API with Node's watch mode. |
| `npm start` | Start the API for production. |
| `npm run seed:admin` | Synchronize User indexes and create the configured admin if it does not exist. |
| `npm run seed:demo` | Add missing demo notes to a selected account. |

The server also runs the idempotent demo seed after connecting to MongoDB at startup. Set `DEMO_EMAIL` to an existing account to choose where the private demo notes belong; it takes precedence over `ADMIN_EMAIL`. If no matching target account exists yet, the server logs a skip and continues starting. Configure `DEMO_EMAIL` in both local `.env` and the deployment environment if the same account should receive the notes.

### Demo notes

Register the intended account first, then select it explicitly when seeding:

```powershell
$env:DEMO_EMAIL = "account@example.com"
npm run seed:demo
```

The script adds up to 20 private notes with `Demo ·` titles and skips matching demo titles already owned by that account. If `DEMO_EMAIL` is omitted, the target falls back to `ADMIN_EMAIL`, then the first user in the database. Review the target account before running it.

## Authentication and authorization

Send a JWT in the standard Authorization header for protected endpoints:

```http
Authorization: Bearer <token>
```

- `POST /api/auth/register` creates a regular `user`; public registration cannot grant admin privileges.
- `POST /api/auth/login` verifies the password and returns a token and a safe user summary.
- `GET /api/auth/me` returns the authenticated user's profile.
- The authentication middleware reloads the user from MongoDB on each request so deleted accounts and role changes take effect.
- Admin routes require the current user's role to be `admin`.

Passwords are hashed with bcrypt before storage and are excluded from normal User queries.

## API reference

All request and response bodies use JSON unless noted otherwise. Protected endpoints require a bearer token. `{id}` and `{userId}` are MongoDB ObjectIds.

### Authentication

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a regular account. Body: `{ "name", "email", "password", "interests" }`; `interests` is optional and defaults to an empty array. Returns `201` with `{ "token", "user" }`. |
| `POST` | `/api/auth/login` | Public | Body: `{ "email", "password" }`. Returns `{ "token", "user" }` on success. |
| `GET` | `/api/auth/me` | User | Return the authenticated user's profile. |

### Notes

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/notes?page=1&limit=10` | User | List only the caller's notes, newest first, with pagination metadata. |
| `POST` | `/api/notes` | User | Create a note owned by the caller. Body: `{ "title", "content" }`. Returns `201`. |
| `GET` | `/api/notes/{id}` | Owner or admin | Read one note. |
| `PUT` | `/api/notes/{id}` | Owner | Update `title` and/or `content`. |
| `DELETE` | `/api/notes/{id}` | Owner | Delete one of the caller's notes. |
| `GET` | `/api/notes/all?page=1&limit=10` | Admin | List every user's notes, including owner name and email. |

An admin may read an individual user's note, but note updates and deletions remain owner-only.

### Users and interests

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/users/grouped-by-interests?page=1&limit=10` | User | Group users by interest using a MongoDB aggregation. An optional `interest` query filters to one interest. |
| `GET` | `/api/users?page=1&limit=10` | Admin | List users. |
| `GET` | `/api/users/{id}` | Admin | Read one user. |
| `POST` | `/api/users` | Admin | Create a user. Body may include `name`, `email`, `password`, `role`, and `interests`. |
| `PUT` | `/api/users/{id}` | Admin | Update provided `name`, `email`, `password`, `role`, and/or `interests` fields. |
| `DELETE` | `/api/users/{id}` | Admin | Delete a user and their notes and posts. An admin cannot delete their own account through this route. |

The grouped-interest response is `{ "data": [...], "page", "limit" }`. Each group contains its interest in `_id`, a user `count`, and a `users` array.

### Community posts

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/posts?page=1&limit=10` | Public | List public posts, newest first, with author name and pagination metadata. |
| `GET` | `/api/posts/user/{userId}?page=1&limit=10` | Public | Return one user's public posts using a single aggregation pipeline with `$lookup`. |
| `POST` | `/api/posts` | User | Publish a post owned by the caller. Body: `{ "title", "body" }`. Returns `201`. |

Post creation is supported; post update and delete endpoints are not implemented.

### Pagination and common responses

List endpoints accept `page` and `limit`. Page numbers are clamped to at least `1`; limits default to `10` and are bounded from `1` to `50`. Standard paginated results use this shape:

```json
{
  "data": [],
  "page": 1,
  "limit": 10,
  "total": 0,
  "totalPages": 0
}
```

The aggregation endpoints return their documented aggregate result shape rather than `total` and `totalPages`.

Common error statuses:

| Status | Meaning |
| --- | --- |
| `400` | Invalid request, schema validation failure, or invalid ObjectId. |
| `401` | Missing, invalid, or expired authentication token. |
| `403` | Authenticated user does not have permission. |
| `404` | Requested record or route was not found. |
| `409` | Duplicate email address. |
| `500` | Unexpected server error. |
| `503` | Database configuration is missing or MongoDB cannot be reached. |

## Data models

All three models use Mongoose timestamps (`createdAt` and `updatedAt`).

| Model | Fields |
| --- | --- |
| User | `name`, unique lowercase `email`, bcrypt-hashed `password`, `role` (`user` or `admin`), and `interests` (string array). |
| Note | `userId` reference, required `title`, and rich-text `content` (HTML string). |
| Post | `userId` reference, required `title`, and rich-text `body` (HTML string). |

## Indexes and aggregation

| Collection | Index | Purpose |
| --- | --- | --- |
| `users` | `{ email: 1 }` (unique) | Login and duplicate-email checks. |
| `users` | `{ interests: 1 }` | Interest filtering before grouping. |
| `notes` | `{ userId: 1, createdAt: -1 }` | A user's note list and count filter. |
| `posts` | `{ userId: 1, createdAt: -1 }` | User-post filtering and newest-first lookup. |

The interest-group endpoint uses one `User.aggregate()` pipeline. The user-post endpoint uses one `User.aggregate()` pipeline with a `$lookup` pipeline against posts.

## File attachments and request size

Editors store formatted note/post content as HTML. Images and supported document attachments are embedded in that content. The frontend limits each attachment to 4 MB and total raw attachment data to 6 MB; Express accepts JSON bodies up to 12 MB. MongoDB's per-document size limit still applies.

## Deployment

The deployed backend base URL is `https://care-guide-note-task-back-end.vercel.app`; its REST API prefix is `https://care-guide-note-task-back-end.vercel.app/api`. Configure the frontend's `VITE_API_URL` to the API prefix. Check `GET /health` after deployment to confirm both the function and MongoDB are available.

For a Node hosting service such as Render:

1. Select the repository and set the service root directory to `backend`.
2. Set the build command to `npm install` and the start command to `npm start`.
3. Configure `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and the `ADMIN_*` values in the host's environment settings.
4. Ensure the MongoDB deployment permits connections from the API host.
5. Restrict CORS to the deployed frontend's origin before making the API public. The current Express app enables CORS without an origin allow-list.
6. Deploy the frontend with `VITE_API_URL` pointing to the API base, such as `https://care-guide-note-task-back-end.vercel.app/api`.

Never put backend secrets in frontend environment variables or commit them to source control.

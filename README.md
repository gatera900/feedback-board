# Feedback Board

A minimal public feedback board with upvotes, category filters, sorting, search, and comments. Built with Express and SQLite, vanilla JS frontend.

## Features

- Submit feedback (title, description, category)
- View list of feedback with upvotes
- Upvote system (limited per device via localStorage)
- Filter by category (All, Feature, Bug, Improvement)
- Sorting: Most Upvoted, Recent
- Search by title/description
- Comments (no auth required)
- Responsive layout

## Tech

- Backend: Node.js + Express + SQLite (sqlite3)
- Frontend: Vanilla HTML/CSS/JS

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Start the server (development)

```bash
npm run dev
```

Server runs at `http://localhost:3000`.

## API

- `GET /api/feedbacks?category=feature|bug|improvement|all&sort=most|recent&search=...`
- `POST /api/feedbacks` body: `{ title, description?, category }`
- `POST /api/feedbacks/:id/upvote`
- `GET /api/feedbacks/:id/comments`
- `POST /api/feedbacks/:id/comments` body: `{ author?, content }`

## Deploy

This is a single-process Express app with SQLite. You can deploy on services that support Node servers (Render, Railway, Fly.io, etc.). Ensure the `data.db` file is persisted.

## License

MIT



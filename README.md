# KWMeJump

KWMeJump is a mobile-first infinite jumping game built with HTML5 Canvas and Vanilla JavaScript. It uses [Vite](https://vitejs.dev/) for development and building, and [Supabase](https://supabase.com/) for a real-time leaderboard.

## Prerequisites

- Node.js (v14 or higher)
- npm (usually comes with Node.js)

## Setup

1. **Clone the repository** (if you haven't already).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in your Supabase credentials:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```
     > You need to create a table named `leaderboard` in your Supabase project with columns: `id` (uuid), `username` (text), `score` (int8), and `created_at` (timestamp).

## Running the Game

To start the local development server:

```bash
npm run dev
```

This will start the server (usually at `http://localhost:5173`). Open that URL in your browser to play.

## Building for Production

To build the project for deployment:

```bash
npm run build
```

The output will be in the `dist/` directory. You can deploy this folder to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

## Deployment (GitHub Pages)

This repository includes a GitHub Actions workflow to automatically deploy the game to GitHub Pages.

1. **Go to Settings > Secrets and variables > Actions** in your GitHub repository.
2. Click **New repository secret** and add:
   - Name: `VITE_SUPABASE_URL`
     - Value: (Your Supabase URL)
   - Name: `VITE_SUPABASE_ANON_KEY`
     - Value: (Your Supabase Anon Key)
3. **Go to Settings > Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Push your code to the `main` branch. The action will trigger, build the game, and deploy it.

## Controls

- **Mobile**: Tap left/right side of the screen to move.
- **Desktop**: Use Arrow Keys (Left/Right) to move.

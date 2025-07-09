# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Architecture Overview

This is a React-based PTO (Paid Time Off) tracker application using:

- **Frontend**: React 19 with Vite as build tool
- **Styling**: Tailwind CSS for utility-first styling
- **Backend**: Supabase for database and authentication
- **Icons**: Lucide React for consistent iconography

### Key Components

- **PTOTracker.jsx**: Main application component containing all views and state management
- **supabase.js**: Database client configuration using environment variables

### Database Schema

The application uses two main Supabase tables:

1. **pto_entries**: Stores PTO requests with fields:
   - `id`, `member`, `type`, `start_date`, `end_date`, `notes`

2. **pto_balances**: Stores annual PTO allocations with fields:
   - `member`, `vacation_days`, `personal_days`

### PTO Types

The application supports four PTO types:
- **vacation**: Vacation/PTO (counts against balance)
- **wfh**: Work From Home (doesn't count against balance)
- **personal**: Personal Day (counts against balance)
- **unpaid**: Unpaid Leave (doesn't count against balance)

### Application Views

1. **Dashboard**: Team overview with PTO summaries and upcoming time off
2. **Calendar View**: Monthly calendar showing all team member PTO with color coding
3. **All Entries**: Table view of all PTO entries with edit/delete actions
4. **Member View**: Individual member's PTO summary and history

### Environment Variables

Required environment variables for Supabase:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Team Members

The application currently supports a hardcoded team of 6 members:
- Kristina, Danielle, Danny, Annabelle, Hannah, Uros

Each member has assigned colors for calendar display visualization.

## Development Notes

- The application uses React hooks for state management (no external state library)
- Data fetching is handled through Supabase client with async/await patterns
- Form validation includes PTO balance checking for vacation and personal days
- Calendar view supports month navigation and displays up to 4 entries per day
- All CRUD operations are handled through Supabase real-time updates
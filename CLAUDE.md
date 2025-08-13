# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development**: `npm run dev` - Runs Next.js with Turbo mode
- **Build project**: `npm run build` - Creates production build
- **Type checking**: `npm run typecheck` - Runs TypeScript compiler without emitting files
- **Linting**: `npm run lint` - Runs ESLint, use `npm run lint:fix` to auto-fix issues
- **Format code**: `npm run format:write` - Formats code with Prettier
- **Check formatting**: `npm run format:check` - Checks code formatting without changes
- **Full check**: `npm run check` - Runs both linting and type checking
- **Database operations**:
  - `npm run db:push` - Push schema changes to database
  - `npm run db:generate` - Generate Prisma client after schema changes
  - `npm run db:migrate` - Run database migrations
  - `npm run db:studio` - Open Prisma Studio for database management

## Architecture Overview

This is a T3 Stack application (Next.js, TypeScript, tRPC, Prisma, NextAuth) that functions as a Blood Alcohol Content (BAC) calculator.

### Core Application Logic

The heart of the application is the BAC calculation engine in `src/lib/bac-calculator.ts`, which:
- Uses the Widmark formula for alcohol absorption and elimination
- Implements proper elimination model (0.015% BAC per hour starting from first drink)
- Supports absorption curves with 30-minute peak absorption time
- Provides precise calculations with 4 decimal places
- Handles real-time BAC tracking, peak predictions, and time-to-target calculations

### Database Schema

The application uses PostgreSQL with Prisma ORM:
- **User**: Stores user authentication data, weight (kg), and sex for BAC calculations
- **Tab**: Represents drinking sessions that users can start/stop
- **Drink**: Records individual drinks with standards (decimal precision) and finish time
- Authentication tables for NextAuth.js (Account, Session, VerificationToken)

### Frontend Architecture

Built with Next.js App Router:
- **Main page** (`src/app/page.tsx`): Handles authentication, tRPC queries, and renders MainContent
- **Components** (`src/components/`): Modular UI components including BACIndicator, DrinksList, various modals
- **User management**: Slide-out drawer system for user info (weight/sex) entry
- **Real-time updates**: Auto-reload hook refreshes data every minute during active sessions
- **Responsive design**: Tailwind CSS with shadcn/ui components

### API Layer

tRPC setup provides type-safe API:
- Server-side procedures in `src/server/api/routers/`
- Client-side hooks via `src/trpc/react.tsx`
- Database operations through Prisma client
- Authentication integration with NextAuth.js

### Key Features

- **Session management**: Users can start/stop drinking tabs
- **Real-time BAC tracking**: Live calculations with absorption curves
- **BAC visualization**: Interactive graphs showing BAC over time
- **Drink management**: Add, edit, delete drinks with precise timing
- **Safety information**: Time to legal driving limit and complete sobriety
- **User profiles**: Weight and biological sex for accurate calculations

### Development Notes

- Uses decimal precision for drink standards and weights throughout
- BAC calculations account for absorption phases and elimination rates
- Auto-refresh functionality keeps data current during active sessions
- Error handling with user-friendly alerts for failed operations
- Type safety enforced with TypeScript and Zod validation
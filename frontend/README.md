# Frontend Setup Guide

## Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)
- Backend API running on `http://localhost:8000`

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

## Environment Setup

Create a `.env.local` file in the `frontend` directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The app will be available at `http://localhost:3000`

## Building for Production

```bash
npm run build
npm start
```

## Common Issues

### Module Not Found: '@/lib/api/client'

This error occurs if the `lib/api/client.ts` file is missing. Make sure you have pulled the latest changes from the repository.

### Backend Connection Failed

If you see "Backend Offline" messages:
1. Ensure the backend API is running on port 8000
2. Check that `NEXT_PUBLIC_API_URL` in `.env.local` points to the correct backend URL
3. Verify CORS is enabled on the backend

### Build Errors

If you encounter build errors after pulling:
1. Delete `node_modules` and `.next` folders:
   ```bash
   rm -rf node_modules .next
   ```
2. Reinstall dependencies:
   ```bash
   npm install
   ```
3. Clear Next.js cache:
   ```bash
   npm run build -- --no-cache
   ```

## Tech Stack

- **Framework**: Next.js 15.2.0 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Components**: Radix UI primitives

## Project Structure

```
frontend/
├── app/                  # Next.js app router pages
│   ├── page.tsx         # Dashboard home
│   ├── settings/        # Settings page
│   ├── model/           # Model metrics page
│   ├── forecast/        # Forecast page
│   ├── sectors/         # Sectors page
│   ├── signals/         # Signals page
│   ├── events/          # Events page
│   └── custom-tracker/  # Custom tracker page
├── components/          # React components
│   ├── dashboard/       # Dashboard-specific components
│   ├── ui/             # Reusable UI components
│   ├── alerts/         # Alert components
│   ├── charts/         # Chart components
│   └── risk/           # Risk-related components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   └── api/           # API client
└── public/            # Static assets
```

## API Integration

The app communicates with the backend through the centralized API client at `lib/api/client.ts`. All API calls should use this client for consistency.

## Development Tips

1. **Hot Reload**: Changes to code will automatically refresh the browser
2. **Type Safety**: The project uses TypeScript - check `tsconfig.json` for config
3. **Linting**: Run `npm run lint` to check for issues
4. **Path Aliases**: Use `@/` to import from the root directory (e.g., `@/components/ui/button`)

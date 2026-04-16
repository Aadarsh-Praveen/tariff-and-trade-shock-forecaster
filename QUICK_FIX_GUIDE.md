# Quick Fix Guide: Module Not Found Error

## Problem
After pulling from GitHub, you get this error when running the frontend:

```
Module not found: Can't resolve '@/lib/api/client'
```

## Root Cause
The `frontend/lib/api/client.ts` file was accidentally excluded from git due to a `.gitignore` rule that blocked ALL `lib/` directories (it was meant to only block Python's `lib/` folder).

## Solution

### Option 1: Pull Latest Changes (Recommended)

The issue has been fixed in the repository. Simply pull the latest changes:

```bash
cd tariff-and-trade-shock-forecaster
git pull origin main
# or your branch name
git pull origin feature/frontend
```

This will bring in:
- `frontend/lib/api/client.ts` (the missing API client)
- Updated `.gitignore` (fixed to not exclude frontend/lib/)
- Updated READMEs with setup instructions

Then rebuild:
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### Option 2: Manual Creation (If Pull Doesn't Work)

If you can't pull for some reason, manually create the missing file:

1. Create the directory structure:
```bash
cd frontend
mkdir -p lib/api
```

2. Create `frontend/lib/api/client.ts` and copy the contents from the repository, or use this command:
```bash
# This file is now in the repo, so git pull should get it
```

## Verification

After fixing, verify the build works:

```bash
cd frontend
npm run dev
```

You should see:
```
✓ Ready in Xms
○ Compiling / ...
✓ Compiled / in Xms
```

If you still see the error, try:
1. Delete `.next` folder: `rm -rf .next`
2. Clear npm cache: `npm cache clean --force`
3. Reinstall: `rm -rf node_modules && npm install`

## What Was Fixed

1. **`.gitignore` updated**: Changed `lib/` to `/lib/` to only exclude the root-level Python lib folder
2. **`frontend/lib/api/client.ts` added**: Complete API client with all backend endpoints
3. **Documentation added**: READMEs for both frontend and main project

## Additional Setup Steps

After pulling, make sure you have:

1. **Backend running**:
```bash
# In project root
uvicorn app.api:app --reload --port 8000
```

2. **Environment variables set**:
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. **Dependencies installed**:
```bash
cd frontend
npm install
```

## Need Help?

If you still encounter issues:

1. Check that you're on the correct branch
2. Verify the file exists: `ls frontend/lib/api/client.ts`
3. Check the file has content: `wc -l frontend/lib/api/client.ts` (should be ~400+ lines)
4. See the detailed setup guide in `frontend/README.md`

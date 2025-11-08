# Migration Instructions: Remove calUrl from Design, GraphicDesigner, and Portraits Documents

## Problem
The database contains documents with `calUrl` fields in the `design`, `graphicDesigner`, and `portraits` tables that are no longer in the schema, causing validation errors.

## Solution Steps

### Step 1: Schema is Already Updated ✅
The schema has been temporarily updated to include `calUrl` in `design`, `graphicDesigner`, and `portraits` tables so the dev server can start.

### Step 2: Run the Migration
You have two options:

#### Option A: Via Convex Dashboard (Recommended)
1. Go to your Convex dashboard: https://dashboard.convex.dev
2. Navigate to your project
3. Go to **Functions** tab
4. Find `design:migrateRemoveCalUrl` in the list
5. Click **Run** (or use the function runner)
6. The migration will remove `calUrl` from all design documents

#### Option B: Via Command Line (After Dev Server Syncs)
Once the dev server has synced the new function, run:
```bash
npx convex run design:migrateRemoveCalUrl
```

### Step 3: Remove calUrl from Schema
After the migration completes successfully:
1. Open `convex/schema.ts`
2. Remove the `calUrl` line from the `portraits` table (around line 224)
3. Remove the `calUrl` line from the `design` table (around line 261)
4. Remove the `calUrl` line from the `graphicDesigner` table (around line 345)
5. Save the file

### Step 4: Clean Up
After verifying the migration worked:
1. Delete the `migrateRemoveCalUrl` mutation from `convex/design.ts`
2. Delete this file (`MIGRATION_INSTRUCTIONS.md`)
3. Delete `scripts/migrate-remove-calurl.js` (if created)

## Verification
After running the migration, verify:
- The dev server starts without schema validation errors
- No documents in the `portraits` table have `calUrl` field
- No documents in the `design` table have `calUrl` field
- No documents in the `graphicDesigner` table have `calUrl` field
- The schema no longer includes `calUrl` in any of the three tables

## Notes
- The migration is safe to run multiple times (it only removes `calUrl` if it exists)
- The migration doesn't require authentication (one-time use only)
- Make sure to delete the migration mutation after use for security


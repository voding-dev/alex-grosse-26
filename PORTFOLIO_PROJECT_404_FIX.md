# Portfolio & Project Pages 404 Fix

## Issue
Portfolio pages (`/portfolio/[slug]`) and project pages (`/project/[slug]`) were showing 404 errors when accessed from the homepage.

## Root Cause
The issue was in how both pages handled the loading state of the Convex `useQuery` hook. 

In Convex:
- `useQuery` returns `undefined` while the query is loading
- It returns `null` if no data is found
- It returns the actual data if found

The pages had this logic:
```typescript
if (!portfolioItem || (portfolioItem.status !== "approved" && portfolioItem.status !== "delivered")) {
  notFound();
}
```

This condition `!portfolioItem` evaluates to `true` when `portfolioItem` is `undefined` (during loading), which immediately triggered the 404 page before the data could even load.

## Solution
Added a proper loading state check before the 404 logic:

```typescript
// Handle loading state
if (portfolioItem === undefined) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-foreground/70">Loading...</p>
      </div>
    </main>
  );
}

// Only show approved/delivered portfolio items publicly
if (!portfolioItem || (portfolioItem.status !== "approved" && portfolioItem.status !== "delivered")) {
  notFound();
}
```

Now the pages properly:
1. Show a loading state when `portfolioItem === undefined` (loading)
2. Show 404 when `portfolioItem === null` (not found) 
3. Show 404 when found but wrong status
4. Render the page when found and correct status

## Files Changed
1. `app/portfolio/[slug]/page.tsx` - Added loading state handling
2. `app/project/[slug]/page.tsx` - Added loading state handling
3. `components/blog/blog-section-renderer.tsx` - Fixed build error (unrelated: multiline className string)

## Testing
To test the fix:
1. Ensure you have portfolio items with status "approved" or "delivered"
2. Navigate to the homepage
3. Click on any portfolio or project card
4. The page should now load correctly instead of showing 404

## Additional Notes
- The homepage correctly uses `api.portfolio.listPublic` and `api.projects.listPublic` which already filter by status
- The individual pages also check status as an additional security measure
- Links are generated correctly as `/portfolio/${slug}` and `/project/${slug}` by the `PortfolioProjectCard` component



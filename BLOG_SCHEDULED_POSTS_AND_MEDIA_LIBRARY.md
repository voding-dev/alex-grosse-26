# Blog System - Scheduled Posts & Media Library Integration

## Summary

Implemented automated scheduled blog post publishing and fully integrated media library components throughout the blog system.

---

## ✅ Part 1: Automated Scheduled Post Publishing

### Problem
Previously, scheduled blog posts would appear published when their scheduled time arrived (via query-time filtering), but their database status remained "scheduled". This caused:
- Admin dashboard showing them as "scheduled" even after they went live
- Inconsistent state management
- No actual automation of status changes

### Solution
Implemented a Convex cron job system that automatically publishes scheduled posts at their designated time.

### Files Created/Modified

#### 1. **`convex/crons.ts`** (NEW)
Created a cron job configuration file:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Publish scheduled blog posts every minute
crons.interval(
  "publish scheduled blog posts",
  { minutes: 1 },
  internal.blogPosts.publishScheduledPosts
);

export default crons;
```

**Key Features:**
- Runs every minute to check for posts ready to publish
- Calls internal mutation to update post statuses
- Efficient and reliable automation

#### 2. **`convex/blogPosts.ts`** (MODIFIED)
Added internal mutation for automated publishing:

```typescript
// Internal mutation: Automatically publish scheduled posts (called by cron)
export const publishScheduledPosts = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find all scheduled posts that should be published
    const scheduledPosts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();
    
    const postsToPublish = scheduledPosts.filter(
      (post) => post.scheduledFor && post.scheduledFor <= now
    );
    
    // Update each post to published status
    for (const post of postsToPublish) {
      await ctx.db.patch(post._id, {
        status: "published",
        publishedAt: post.scheduledFor || now,
        updatedAt: now,
      });
    }
    
    return {
      published: postsToPublish.length,
      posts: postsToPublish.map(p => ({ 
        id: p._id, 
        title: p.title, 
        scheduledFor: p.scheduledFor 
      })),
    };
  },
});
```

**Key Features:**
- Internal-only mutation (can't be called from client)
- Queries all scheduled posts
- Filters for posts past their scheduled time
- Updates status to "published"
- Sets `publishedAt` to the scheduled time
- Returns metadata for logging/monitoring

### How It Works

1. **Every Minute:**
   - Cron job triggers `publishScheduledPosts` mutation
   
2. **Mutation Process:**
   - Queries all posts with `status: "scheduled"`
   - Filters for posts where `scheduledFor <= now`
   - Updates each matching post:
     - `status`: "scheduled" → "published"
     - `publishedAt`: set to `scheduledFor` timestamp
     - `updatedAt`: current timestamp

3. **Result:**
   - Posts automatically go live at exact scheduled time
   - Database state remains consistent
   - Admin dashboard accurately reflects status
   - Public-facing queries work correctly

### Testing Scheduled Posts

1. Create a new blog post
2. Set status to "Scheduled"
3. Set scheduled date/time to a few minutes in the future
4. Save the post
5. Wait for the scheduled time
6. Within 1 minute of scheduled time:
   - Post will automatically publish
   - Status will change to "Published" in admin
   - Post will appear on public blog

---

## ✅ Part 2: Media Library Integration

### Problem
Blog editor had inline, one-off upload code without the ability to select from existing media library. This led to:
- Duplicate uploads of same images
- No reuse of existing media
- Inconsistent UI patterns
- More code to maintain

### Solution
Integrated the newly created `ImageUploadButton` and `MediaLibrarySelector` components throughout the blog system.

### Integration Points

#### 1. **Blog Post Editor - Cover Image** (`app/admin/blog/[id]/page.tsx`)

**Before:**
- Single inline upload with hidden file input
- No way to select from library
- Basic UI

**After:**
```typescript
{coverImageUrl ? (
  <div>
    <img src={coverImageUrl} alt="Cover" className="w-full rounded-lg mb-4 shadow-md" />
    <div className="flex gap-2">
      <Button onClick={() => setCoverLibraryOpen(true)}>
        <ImageIcon className="h-4 w-4 mr-2" />
        Change Image
      </Button>
      <Button variant="destructive" onClick={removeCover}>
        <X className="h-4 w-4 mr-2" />
        Remove Image
      </Button>
    </div>
  </div>
) : (
  <div className="space-y-2">
    <ImageUploadButton
      onUploadComplete={(result) => {
        updatePost({ coverImageStorageId: result.storageKey });
      }}
      displayLocation={{
        type: "blog_cover",
        entityId: post._id,
        entityName: post.title,
        subType: "blog",
      }}
    />
    <Button onClick={() => setCoverLibraryOpen(true)}>
      <ImageIcon className="h-4 w-4 mr-2" />
      Select from Library
    </Button>
  </div>
)}

<MediaLibrarySelector
  open={coverLibraryOpen}
  onOpenChange={setCoverLibraryOpen}
  onSelect={(items) => {
    updatePost({ coverImageStorageId: items[0].storageKey });
  }}
  title="Select Cover Image"
  multiple={false}
/>
```

**Features:**
- Upload new image with duplicate detection
- Select from existing media library
- Change or remove current image
- Automatic media library tracking
- On-brand styling

#### 2. **Blog Post Editor - OG Image** (`app/admin/blog/[id]/page.tsx`)

Same integration as cover image, but for Open Graph social media images:
- Upload new OG image (1200×630px recommended)
- Select from media library
- Change or remove current OG image
- Display location tracking: `"blog_og"`

#### 3. **Blog Section Editor - Image Sections** (`components/blog/section-editor.tsx`)

**Before:**
- Inline upload with hidden file input
- "Change Image" button just removed the image
- No library selection

**After:**
```typescript
{imageUrl ? (
  <div>
    <img src={imageUrl} alt={section.imageAlt} className="w-full rounded-lg shadow-md" />
    <div className="flex gap-2 mt-3">
      <Button onClick={() => setImageLibraryOpen(true)}>
        <ImageIcon className="h-4 w-4 mr-2" />
        Change Image
      </Button>
      <Button variant="destructive" onClick={removeImage}>
        <Trash2 className="h-4 w-4 mr-2" />
        Remove
      </Button>
    </div>
  </div>
) : (
  <div className="space-y-2">
    <ImageUploadButton
      onUploadComplete={(result) => {
        handleUpdate({
          imageStorageId: result.storageKey,
          imageWidth: result.width,
          imageHeight: result.height,
        });
      }}
      displayLocation={{
        type: "blog_section",
        entityId: section._id,
        entityName: "Blog Section Image",
        subType: "blog",
      }}
    />
    <Button onClick={() => setImageLibraryOpen(true)}>
      <ImageIcon className="h-4 w-4 mr-2" />
      Select from Library
    </Button>
  </div>
)}

<MediaLibrarySelector
  open={imageLibraryOpen}
  onOpenChange={setImageLibraryOpen}
  onSelect={(items) => {
    handleUpdate({ imageStorageId: items[0].storageKey });
  }}
  title="Select Section Image"
  multiple={false}
/>
```

**Features:**
- Upload new section images
- Select from media library
- Change or remove images
- Track image dimensions
- Section-specific display location tracking

### Files Modified

#### **`app/admin/blog/[id]/page.tsx`**
- Added imports for `ImageUploadButton` and `MediaLibrarySelector`
- Added state for modal controls: `coverLibraryOpen`, `ogLibraryOpen`
- Replaced cover image upload with component
- Replaced OG image upload with component
- Added two `MediaLibrarySelector` instances at bottom

**Changes:**
```typescript
// Added imports
import { ImageUploadButton, MediaLibrarySelector } from "@/components/media-library";

// Added state
const [coverLibraryOpen, setCoverLibraryOpen] = useState(false);
const [ogLibraryOpen, setOgLibraryOpen] = useState(false);

// Replaced inline upload code with components (2 locations)
// Added MediaLibrarySelector modals (2 instances)
```

#### **`components/blog/section-editor.tsx`**
- Added imports for media library components
- Added state: `imageLibraryOpen`
- Wrapped return in fragment to support multiple elements
- Replaced image upload with components
- Added `MediaLibrarySelector` for image sections

**Changes:**
```typescript
// Added imports
import { ImageUploadButton, MediaLibrarySelector } from "@/components/media-library";

// Added state
const [imageLibraryOpen, setImageLibraryOpen] = useState(false);

// Wrapped return in fragment
return (
  <>
    <Card>...</Card>
    {section.type === "image" && (
      <MediaLibrarySelector ... />
    )}
  </>
);
```

### User Experience Improvements

#### Upload Flow:
1. **Click "Upload Image"**
   - File picker opens
   - Select image file
   - Automatic compression and optimization
   - Duplicate detection (reuses if already uploaded)
   - Progress indicator
   - Success toast notification
   - Image appears immediately

2. **Click "Select from Library"**
   - Modal opens with all existing media
   - Search by filename
   - Filter by folder
   - Grid view with previews
   - Click to select (checkmark appears)
   - Click "Add" to confirm
   - Image appears immediately

3. **Change/Remove Options:**
   - When image is set, two buttons appear
   - "Change Image" → opens library selector
   - "Remove" → clears the image

### Benefits

✅ **No More Duplicates:**
- Duplicate detection prevents uploading same image twice
- Easy to browse and reuse existing images

✅ **Consistent UI:**
- Same components used everywhere
- Same behavior and styling
- Familiar patterns for users

✅ **Better Organization:**
- Media library tracks all usage locations
- Know where each image is used
- Easy to manage media centrally

✅ **Improved Performance:**
- Reusing images saves storage
- Faster than re-uploading
- Optimized image handling

✅ **On-Brand Styling:**
- All components match site aesthetic
- Bold uppercase labels
- Accent color highlights
- Smooth transitions

---

## 📊 Summary of Changes

### Files Created:
1. `convex/crons.ts` - Cron job configuration

### Files Modified:
1. `convex/blogPosts.ts` - Added `publishScheduledPosts` internal mutation
2. `app/admin/blog/[id]/page.tsx` - Integrated media library for cover and OG images
3. `components/blog/section-editor.tsx` - Integrated media library for section images

### Components Used:
- `ImageUploadButton` - Handles uploading with duplicate detection
- `MediaLibrarySelector` - Modal for selecting from existing media

### Total Integration Points:
- 3 upload locations (cover, OG, section images)
- 3 library selector locations (same)
- All with proper display location tracking

---

## 🧪 Testing Checklist

### Scheduled Posts:
- [x] Create post with scheduled status
- [x] Set future date/time
- [x] Verify status remains "scheduled" initially
- [x] Wait for scheduled time
- [x] Verify status changes to "published" within 1 minute
- [x] Verify post appears on public blog
- [x] Verify admin dashboard shows as published

### Media Library - Cover Images:
- [x] Upload new cover image
- [x] Verify duplicate detection works
- [x] Select cover image from library
- [x] Change cover image via library
- [x] Remove cover image
- [x] Verify image appears on blog listing
- [x] Verify image appears on individual post

### Media Library - OG Images:
- [x] Upload new OG image
- [x] Select OG image from library
- [x] Change OG image via library
- [x] Remove OG image
- [x] Verify OG meta tags on post page

### Media Library - Section Images:
- [x] Add image section to post
- [x] Upload image via button
- [x] Select image from library
- [x] Change section image
- [x] Remove section image
- [x] Verify image renders on public post

### Display Location Tracking:
- [x] Upload images with display locations
- [x] Verify locations tracked in media library
- [x] Check for proper categorization

---

## 🎯 Usage Examples

### Creating a Scheduled Post:

1. Go to `/admin/blog/new`
2. Enter title and excerpt
3. Click "Create"
4. In editor, go to "Settings" tab
5. Select "Scheduled" status
6. Set date and time in future
7. Click "Save"
8. Post will automatically publish at scheduled time

### Adding Cover Image:

**Option 1 - Upload New:**
1. Go to blog post editor
2. Click "Content" tab
3. Find "Cover Image" section
4. Click "Upload Cover Image"
5. Select image file
6. Done!

**Option 2 - Select Existing:**
1. Click "Select from Library"
2. Browse or search for image
3. Click image to select
4. Click "Set as Cover"
5. Done!

### Adding Section Image:

1. Go to blog post editor
2. Click "Content" tab
3. Click "Add Section" → "Image"
4. Either:
   - Click "Upload Image" to add new
   - Click "Select from Library" to reuse existing
5. Add alt text
6. Done!

---

## 🚀 Future Enhancements

### Potential additions:
- Bulk upload for section galleries
- Image editing/cropping before upload
- Drag & drop file upload
- Video support in sections
- Gallery section with library selector
- Media usage analytics
- Automatic image optimization presets
- Scheduled post preview before publish

---

## ✅ Status: Complete

All scheduled post automation and media library integration is complete and ready for use!

### What's Working:
✅ Cron job publishes scheduled posts automatically every minute
✅ Cover images support upload and library selection
✅ OG images support upload and library selection
✅ Section images support upload and library selection
✅ All components are on-brand and responsive
✅ Display location tracking for all uploads
✅ Duplicate detection prevents redundant uploads
✅ No linter errors

### Ready for Production:
- Scheduled posts will publish automatically
- Media library fully integrated
- Consistent UI patterns throughout
- Proper error handling
- Toast notifications for feedback


# Media Library Components

Reusable components for uploading to and selecting from the media library.

## Components

### ImageUploadButton

A button component that handles image uploads to the media library with duplicate detection, compression, and display location tracking.

#### Basic Usage

```typescript
import { ImageUploadButton } from "@/components/media-library";

<ImageUploadButton
  onUploadComplete={(result) => {
    console.log("Storage Key:", result.storageKey);
    console.log("Dimensions:", result.width, result.height);
    console.log("Is Duplicate:", result.isDuplicate);
  }}
/>
```

#### With Display Location Tracking

```typescript
<ImageUploadButton
  onUploadComplete={(result) => {
    // Save to your database
    updatePost({ coverImageStorageId: result.storageKey });
  }}
  displayLocation={{
    type: "blog_cover",
    entityId: post._id,
    entityName: post.title,
    subType: "blog",
  }}
  buttonText="Upload Cover Image"
  variant="outline"
/>
```

#### Multiple File Upload

```typescript
<ImageUploadButton
  onUploadComplete={(result) => {
    // Called once per file
    addImageToGallery(result);
  }}
  multiple={true}
  buttonText="Upload Images"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onUploadComplete` | `(result: UploadResult) => void` | **required** | Callback when upload completes |
| `displayLocation` | `DisplayLocation` | `undefined` | Tracks where media is used |
| `buttonText` | `string` | `"Upload Image"` | Button label |
| `variant` | `ButtonVariant` | `"outline"` | Button style |
| `size` | `ButtonSize` | `"default"` | Button size |
| `disabled` | `boolean` | `false` | Disable button |
| `className` | `string` | `""` | Additional CSS classes |
| `accept` | `string` | `"image/*"` | File input accept attribute |
| `multiple` | `boolean` | `false` | Allow multiple file selection |

---

### MediaLibrarySelector

A modal component for selecting images/videos from the media library with search, filtering, and multiple selection support.

#### Basic Usage

```typescript
import { MediaLibrarySelector } from "@/components/media-library";

const [open, setOpen] = useState(false);

<>
  <Button onClick={() => setOpen(true)}>
    Select from Library
  </Button>
  
  <MediaLibrarySelector
    open={open}
    onOpenChange={setOpen}
    onSelect={(items) => {
      console.log("Selected:", items);
      // items[0].storageKey
      // items[0].filename
    }}
  />
</>
```

#### Single Image Selection

```typescript
<MediaLibrarySelector
  open={isOpen}
  onOpenChange={setIsOpen}
  onSelect={(items) => {
    const selected = items[0];
    updatePost({ coverImageStorageId: selected.storageKey });
  }}
  title="Select Cover Image"
  description="Choose an image for your blog post cover"
  multiple={false}
  mediaType="image"
/>
```

#### Multiple Image Selection

```typescript
<MediaLibrarySelector
  open={isOpen}
  onOpenChange={setIsOpen}
  onSelect={(items) => {
    items.forEach(item => {
      addToGallery(item.storageKey);
    });
  }}
  title="Select Gallery Images"
  description="Choose multiple images for your gallery"
  multiple={true}
  mediaType="image"
  confirmButtonText="Add to Gallery"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | **required** | Modal open state |
| `onOpenChange` | `(open: boolean) => void` | **required** | Open state change handler |
| `onSelect` | `(items: MediaItem[]) => void` | **required** | Selection handler |
| `title` | `string` | `"Select from Media Library"` | Modal title |
| `description` | `string` | `"Choose images..."` | Modal description |
| `multiple` | `boolean` | `false` | Allow multiple selection |
| `mediaType` | `"all" \| "image" \| "video"` | `"image"` | Filter by media type |
| `confirmButtonText` | `string` | `"Add N Image(s)"` | Custom confirm button text |

---

## Types

### UploadResult

```typescript
interface UploadResult {
  storageKey: string;      // Convex storage ID
  width: number;           // Image width in pixels
  height: number;          // Image height in pixels
  size: number;            // File size in bytes
  isDuplicate: boolean;    // Whether file already existed
  duplicateId?: string;    // Media library ID if duplicate
}
```

### DisplayLocation

```typescript
interface DisplayLocation {
  type: string;            // e.g., "blog_cover", "hero_carousel"
  entityId: string;        // ID of the entity using this media
  entityName: string;      // Display name of the entity
  subType?: string;        // Optional sub-categorization
}
```

### MediaItem

```typescript
interface MediaItem {
  _id: string;             // Media library ID
  storageKey: string;      // Convex storage ID
  filename: string;        // Original filename
  type: "image" | "video"; // Media type
}
```

---

## Real-World Examples

### Blog Post Cover Image

```typescript
// In blog editor
import { ImageUploadButton, MediaLibrarySelector } from "@/components/media-library";

const [selectLibraryOpen, setSelectLibraryOpen] = useState(false);

<div className="space-y-2">
  <Label>Cover Image</Label>
  
  {/* Upload new */}
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
  
  {/* Or select existing */}
  <Button variant="outline" onClick={() => setSelectLibraryOpen(true)}>
    Select from Library
  </Button>
  
  <MediaLibrarySelector
    open={selectLibraryOpen}
    onOpenChange={setSelectLibraryOpen}
    onSelect={(items) => {
      updatePost({ coverImageStorageId: items[0].storageKey });
    }}
    multiple={false}
  />
</div>
```

### Gallery Builder

```typescript
const [galleryOpen, setGalleryOpen] = useState(false);

<>
  <Button onClick={() => setGalleryOpen(true)}>
    Add Images to Gallery
  </Button>
  
  <MediaLibrarySelector
    open={galleryOpen}
    onOpenChange={setGalleryOpen}
    onSelect={(items) => {
      items.forEach(item => {
        addGalleryImage({
          storageId: item.storageKey,
          alt: item.filename,
        });
      });
    }}
    title="Select Gallery Images"
    description="Choose multiple images to add to your gallery"
    multiple={true}
    confirmButtonText="Add to Gallery"
  />
</>
```

### Section Image with Both Options

```typescript
{imageUrl ? (
  <div>
    <img src={imageUrl} alt="Section" className="w-full rounded" />
    <Button onClick={() => removeImage()}>Remove</Button>
  </div>
) : (
  <div className="flex gap-2">
    <ImageUploadButton
      onUploadComplete={(result) => {
        updateSection({ imageStorageId: result.storageKey });
      }}
      displayLocation={{
        type: "blog_section",
        entityId: section._id,
        entityName: "Blog Section",
      }}
    />
    
    <Button variant="outline" onClick={() => setLibraryOpen(true)}>
      Choose from Library
    </Button>
  </div>
)}
```

---

## Styling

Both components use on-brand styling:
- **Font weights**: 900 for headings
- **Accent color**: #FFA617
- **Uppercase text** with tracking
- **Border thickness**: 2px
- **Responsive** grid layouts
- **Smooth transitions**
- **Clear hover states**

---

## Integration with Convex

These components automatically integrate with:
- `api.storageMutations.generateUploadUrl`
- `api.mediaLibrary.checkDuplicateMutation`
- `api.mediaLibrary.create`
- `api.mediaLibrary.addDisplayLocation`
- `api.mediaLibrary.list`
- `api.mediaLibrary.getFolders`
- `api.storageQueries.getUrl`

No additional setup required beyond what's already in the project.

---

## Best Practices

1. **Always provide displayLocation** when you can - helps track media usage
2. **Use MediaLibrarySelector for existing media** - reduces duplicate uploads
3. **Offer both upload and select options** - best UX
4. **Clear the file input after upload** - already handled automatically
5. **Show loading states** - already built-in
6. **Handle errors with toasts** - already implemented

---

## Troubleshooting

### Upload not working
- Check that `sessionToken` is available from `useAdminAuth()`
- Verify Convex mutations are imported correctly
- Check browser console for errors

### Images not displaying in selector
- Verify media library has content
- Check that `api.mediaLibrary.list` query is working
- Ensure storage URLs are accessible

### Duplicate detection not working
- Check that `checkDuplicateMutation` is working
- Verify file hashes are being calculated correctly
- Review media library entries in Convex dashboard

---

## Future Enhancements

Potential additions:
- Image cropping before upload
- Drag & drop file upload
- Paste image from clipboard
- Video preview in selector
- Bulk selection actions
- Folder management in selector
- Sort options (date, name, size)
- Grid/list view toggle



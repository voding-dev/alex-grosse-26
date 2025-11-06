# Admin Pages Responsive Design Checklist

## General Responsive Design Checklist

### Layout & Container
- [ ] Page uses responsive container (max-w-7xl mx-auto px-4 sm:px-6 or similar)
- [ ] Padding adjusts for mobile (px-4 sm:px-6, py-8 sm:py-12)
- [ ] No horizontal overflow on mobile (< 640px)
- [ ] Content is readable without zooming on mobile

### Typography
- [ ] Heading sizes scale appropriately (text-3xl sm:text-4xl lg:text-5xl)
- [ ] Body text is readable on mobile (minimum 14px/0.875rem)
- [ ] Line heights are appropriate for mobile
- [ ] Text doesn't overflow containers

### Grids & Cards
- [ ] Grid layouts use responsive columns (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- [ ] Cards stack vertically on mobile
- [ ] Card content doesn't overflow on small screens
- [ ] Images within cards are responsive

### Forms & Inputs
- [ ] Form inputs are full width on mobile (w-full)
- [ ] Labels and inputs stack vertically on mobile if needed
- [ ] Buttons are appropriately sized for touch (min-height 44px)
- [ ] Form sections have proper spacing on mobile

### Headers & Navigation
- [ ] Page headers stack vertically on mobile (flex-col sm:flex-row)
- [ ] Action buttons wrap or stack on mobile
- [ ] Header text doesn't truncate unexpectedly

### Tables & Lists
- [ ] Tables scroll horizontally on mobile if needed (overflow-x-auto)
- [ ] Lists stack properly on mobile
- [ ] Table cells don't break layout

### Buttons & Actions
- [ ] Buttons are appropriately sized for mobile (touch targets ≥ 44px)
- [ ] Button groups wrap on mobile (flex-wrap)
- [ ] Primary actions are easily accessible on mobile

### Images & Media
- [ ] Images are responsive (w-full h-auto or aspect-ratio)
- [ ] Image containers don't break layout on mobile
- [ ] Image uploads work on mobile

### Modals & Dialogs
- [ ] Modals are full-width on mobile with proper padding
- [ ] Modal content scrolls if needed
- [ ] Close buttons are easily accessible

### Specific Admin Patterns
- [ ] Stats cards stack on mobile (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- [ ] Empty states are centered and readable on mobile
- [ ] Info banners wrap text properly
- [ ] Badge/tag groups wrap (flex-wrap)

## Breakpoints Reference
- Mobile: < 640px (default)
- Tablet: ≥ 640px (sm:)
- Desktop: ≥ 768px (md:)
- Large Desktop: ≥ 1024px (lg:)
- XL Desktop: ≥ 1280px (xl:)







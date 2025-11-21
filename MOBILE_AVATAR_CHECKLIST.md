# UserAvatar Mobile Responsiveness Checklist

## Visual Inspection Guide

### Mobile View (< 768px)

#### Avatar Button

- [ ] Avatar displays with proper size (40px on mobile, 44px on small tablets)
- [ ] Touch target is minimum 44x44px
- [ ] Initials are clearly visible and centered
- [ ] Gradient background displays correctly
- [ ] Focus ring appears on keyboard navigation
- [ ] Hover effect shows subtle ring on devices that support it

#### Drawer Behavior

- [ ] Drawer slides up from bottom when avatar is clicked
- [ ] Drawer can be dismissed by swiping down
- [ ] Drawer can be dismissed by tapping outside
- [ ] Drawer doesn't cover entire screen (leaves space at top)

#### Drawer Content

- [ ] User avatar displays larger (64px) in drawer header
- [ ] Full name displays clearly
- [ ] AWS Builder handle displays with @ prefix
- [ ] Content is centered horizontally
- [ ] Proper spacing between elements (not cramped)

#### Action Buttons

- [ ] "Edit Profile" button has minimum 56px height
- [ ] "Logout" button has minimum 56px height
- [ ] Both buttons are full-width
- [ ] Icons are properly sized (20px)
- [ ] Text is readable (16px base size)
- [ ] Buttons have proper touch feedback (background color change)
- [ ] Adequate spacing between buttons (8px gap)

#### Interactions

- [ ] Clicking "Edit Profile" navigates to profile page
- [ ] Clicking "Edit Profile" closes the drawer
- [ ] Clicking "Logout" logs out the user
- [ ] Clicking "Logout" closes the drawer
- [ ] No accidental double-taps or missed taps

### Desktop View (>= 768px)

#### Dropdown Menu

- [ ] Dropdown appears on click (not drawer)
- [ ] Dropdown aligns to the right edge of avatar
- [ ] Compact sizing appropriate for desktop
- [ ] Hover states work on menu items
- [ ] Dropdown closes when clicking outside

### Navigation Integration

#### Mobile Header

- [ ] Logo, +, Avatar, Menu icons all visible
- [ ] No horizontal scrolling
- [ ] Proper spacing between elements
- [ ] All touch targets are 44x44px minimum
- [ ] Header height is appropriate (64px)

#### Desktop Header

- [ ] Gallery link visible
- [ ] - button with tooltip visible
- [ ] Avatar visible
- [ ] Proper spacing and alignment
- [ ] Tooltip shows "Add App" on hover

### Accessibility

- [ ] Avatar button has aria-label="User menu"
- [ ] Drawer title is properly announced
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus is trapped within drawer when open
- [ ] Focus returns to avatar button when drawer closes
- [ ] Screen reader announces user name and handle

### Edge Cases

- [ ] Works on 320px width (smallest mobile)
- [ ] Works on 375px width (iPhone SE)
- [ ] Works on 768px width (tablet breakpoint)
- [ ] Long names don't break layout
- [ ] Long handles don't break layout
- [ ] Works in portrait and landscape orientations

## Testing Instructions

1. Start dev server: `bun run dev`
2. Open browser to localhost
3. Sign in (toggle auth)
4. Open browser DevTools
5. Toggle device toolbar (Cmd+Shift+M on Mac)
6. Test at different viewport sizes:
   - 320px (iPhone SE)
   - 375px (iPhone 12/13)
   - 390px (iPhone 14)
   - 768px (iPad)
   - 1024px (Desktop)
7. Click avatar and verify drawer/dropdown behavior
8. Test all interactions
9. Verify touch targets with pointer
10. Test keyboard navigation

## Current Implementation

### Mobile (< 768px)

- Uses Vaul Drawer component
- Slides up from bottom
- Centered content layout
- Large avatar (64px) in header
- Full-width action buttons (56px height)
- Spacious padding for thumb-friendly interaction

### Desktop (>= 768px)

- Uses Radix Dropdown Menu
- Compact layout
- Right-aligned to avatar
- Smaller touch targets appropriate for mouse
- Hover states for visual feedback

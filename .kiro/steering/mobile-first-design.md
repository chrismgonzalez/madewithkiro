---
inclusion: fileMatch
fileMatchPattern: '*.tsx,*.css'
---

# Mobile-First Design Enforcement

## Core Principles

All components MUST follow mobile-first responsive design patterns. Start with mobile (320px) and progressively enhance for larger screens.

## Tailwind Responsive Breakpoints

Use Tailwind's responsive prefixes in this order:

- Base styles: Mobile (320px+) - NO PREFIX
- `sm:` - Small tablets (640px+)
- `md:` - Tablets/Small laptops (768px+)
- `lg:` - Laptops (1024px+)
- `xl:` - Desktops (1280px+)
- `2xl:` - Large desktops (1536px+)

## Touch Target Requirements

- Minimum touch target: 44x44px (use `min-h-[44px] min-w-[44px]`)
- Apply to all interactive elements: buttons, links, form inputs
- Ensure adequate spacing between touch targets (min 8px gap)

## Component Patterns

### Layout Components

```tsx
// ✅ CORRECT: Mobile-first container
<div className="px-4 sm:px-6 lg:px-8">
  <div className="max-w-7xl mx-auto">
    {/* Content */}
  </div>
</div>

// ❌ WRONG: Desktop-first
<div className="px-8 md:px-4">
```

### Grid Layouts

```tsx
// ✅ CORRECT: Mobile-first grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

// ❌ WRONG: Desktop-first
<div className="grid grid-cols-3 md:grid-cols-1">
```

### Typography

```tsx
// ✅ CORRECT: Mobile-first text sizing
<h1 className="text-2xl sm:text-3xl lg:text-4xl">

// ❌ WRONG: Desktop-first
<h1 className="text-4xl md:text-2xl">
```

### Navigation

```tsx
// ✅ CORRECT: Mobile hamburger, desktop inline
<div className="md:hidden">
  <Sheet>{/* Mobile menu */}</Sheet>
</div>
<div className="hidden md:flex">
  {/* Desktop nav links */}
</div>
```

### Spacing

```tsx
// ✅ CORRECT: Mobile-first spacing
<div className="py-8 md:py-12 lg:py-16">
<div className="gap-4 md:gap-6 lg:gap-8">

// ❌ WRONG: Desktop-first
<div className="py-16 md:py-8">
```

### Flex Direction

```tsx
// ✅ CORRECT: Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row">

// ❌ WRONG: Row on mobile
<div className="flex flex-row md:flex-col">
```

## shadcn/ui Component Usage

### Buttons

```tsx
// Always include minimum touch targets
<Button className="min-h-[44px] min-w-[44px]">
  <Icon className="h-4 w-4 sm:mr-2" />
  <span className="hidden sm:inline">Label</span>
</Button>
```

### Cards

```tsx
// Mobile-first card spacing
<Card className="p-4 sm:p-6">
  <CardHeader className="space-y-2 sm:space-y-3">
    <CardTitle className="text-lg sm:text-xl">
```

### Forms

```tsx
// Stack form fields on mobile
<form className="space-y-4 sm:space-y-6">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

### Dialogs & Sheets

```tsx
// Use Sheet for mobile, Dialog for desktop when appropriate
<Sheet>{
  /* Mobile full-screen */
} <
  Dialog >
  {
    /* Desktop modal */
  };
```

## Accessibility Requirements

- All interactive elements must have proper ARIA labels
- Ensure keyboard navigation works on all screen sizes
- Test with screen readers on mobile devices
- Maintain color contrast ratios (WCAG AA minimum)
- Use semantic HTML elements

## Testing Checklist

Before committing any component:

1. ✅ Test at 320px width (smallest mobile)
2. ✅ Test at 375px (iPhone SE)
3. ✅ Test at 768px (tablet)
4. ✅ Test at 1024px (laptop)
5. ✅ Verify all touch targets are 44x44px minimum
6. ✅ Check text readability on mobile
7. ✅ Ensure no horizontal scrolling on mobile
8. ✅ Test with touch interactions (not just mouse)

## Common Patterns

### Responsive Images

```tsx
<img className="w-full h-auto sm:w-auto sm:h-64 lg:h-80" alt="Description" />
```

### Responsive Text

```tsx
<p className="text-sm sm:text-base lg:text-lg">
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
```

### Responsive Padding/Margin

```tsx
<section className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
```

### Responsive Gaps

```tsx
<div className="flex gap-2 sm:gap-4 lg:gap-6">
<div className="space-y-4 sm:space-y-6 lg:space-y-8">
```

## Icon Sizing

Use consistent icon sizes with lucide-react:

- Mobile: 16px or 20px (`h-4 w-4` or `h-5 w-5`)
- Desktop: 20px or 24px (`h-5 w-5` or `h-6 w-6`)

```tsx
<Icon className="h-4 w-4 sm:h-5 sm:w-5" />
```

## Performance Considerations

- Lazy load images below the fold
- Use responsive images with srcset
- Minimize JavaScript bundle size
- Optimize for mobile network conditions
- Use CSS transforms for animations (GPU accelerated)

## Component Review Criteria

When reviewing or creating components, ask:

1. Does it work on 320px width?
2. Are all touch targets 44x44px minimum?
3. Is text readable on mobile without zooming?
4. Does the layout adapt gracefully to larger screens?
5. Are responsive breakpoints used correctly (mobile-first)?
6. Is the component accessible on mobile devices?
7. Does it follow the established patterns?

## Examples from Project

Reference these components for mobile-first patterns:

- `Navigation.tsx` - Mobile hamburger menu pattern
- `ApplicationCard.tsx` - Responsive card layout
- `Layout.tsx` - Mobile-first container pattern

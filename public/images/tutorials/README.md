# Tutorial Images Guide

## 📐 **Recommended Image Sizes**

### **Desktop/Web Images**
- **Width**: 600-800 pixels
- **Height**: 400-600 pixels  
- **Aspect Ratio**: 4:3 or 16:10 for best fit
- **Format**: PNG (preferred) or JPG
- **File Size**: Under 500KB for fast loading

### **Mobile-Optimized Images**
- **Width**: 400-600 pixels
- **Height**: 300-450 pixels
- **Aspect Ratio**: 4:3 for better mobile display
- **Format**: WebP (modern browsers) or PNG

## 📁 **Folder Structure**

```
public/images/tutorials/
├── inventory/
│   ├── product-list.png
│   ├── filters.png
│   └── qr-scanner.png
├── checkout/
│   ├── cart-view.png
│   ├── customer-selection.png
│   └── payment-processing.png
├── sales/
│   ├── sales-dashboard.png
│   └── profit-distribution.png
└── general/
    ├── welcome-dashboard.png
    ├── sidebar-navigation.png
    └── help-button.png
```

## 🎨 **Image Guidelines**

### **Content**
- Show actual UI elements from FootVault
- Highlight the specific feature being explained
- Use arrows, highlights, or callouts to draw attention
- Keep screenshots clean and uncluttered

### **Quality**
- High DPI/Retina ready (2x resolution)
- Clear, crisp screenshots
- Consistent styling across all images
- Good contrast and readability

### **Naming Convention**
- Use kebab-case: `product-search-filters.png`
- Be descriptive: `checkout-customer-selection.png`
- Include page name: `inventory-bulk-actions.png`

## 🖼️ **How to Add Images**

In `lib/tutorial-content.ts`, add the image property to any step:

```typescript
{
  id: "step-id",
  title: "Step Title",
  description: "Step description...",
  image: "/images/tutorials/inventory/product-list.png",
  tips: [...]
}
```

## 📱 **Responsive Display**

The tutorial modal automatically handles responsive image display:
- **Desktop**: Images show in right column alongside text
- **Mobile**: Images stack below text content
- **Tablet**: Adaptive layout based on screen size

## 🎯 **Best Practices**

1. **Screenshot Tools**: Use tools like Snagit, CleanShot X, or browser dev tools
2. **Annotations**: Add arrows, highlights, or numbered callouts
3. **Consistency**: Use the same browser/theme for all screenshots
4. **Updates**: Keep images current with UI changes
5. **Optimization**: Compress images without losing quality
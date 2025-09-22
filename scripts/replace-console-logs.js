#!/usr/bin/env node

/**
 * Script to replace console.log with logger utility
 * Run with: node scripts/replace-console-logs.js
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'components/shoes-inventory-table.tsx',
  'components/shoes-variants-table.tsx', 
  'components/sales-client-wrapper.tsx',
  'components/customers-page-client.tsx',
  'app/consignors/page.tsx',
  'components/preorders-page-client.tsx'
];

const replacements = [
  { from: /console\.time\(/g, to: 'logger.time(' },
  { from: /console\.timeEnd\(/g, to: 'logger.timeEnd(' },
  { from: /console\.log\(/g, to: 'logger.log(' },
  { from: /console\.debug\(/g, to: 'logger.debug(' },
  { from: /console\.info\(/g, to: 'logger.info(' },
  // Keep console.error and console.warn as they are important
];

const loggerImport = `import { logger } from '@/lib/utils/logger';\n`;

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Add logger import if console logs are found and logger import doesn't exist
  if (content.includes('console.') && !content.includes("from '@/lib/utils/logger'")) {
    // Find the last import statement
    const importRegex = /import.*from.*['"][^'"]*['"];?\n/g;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
      content = content.slice(0, lastImportIndex) + loggerImport + content.slice(lastImportIndex);
      modified = true;
    }
  }

  // Replace console methods with logger
  replacements.forEach(({ from, to }) => {
    if (content.match(from)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
});

console.log('\n🎉 Console log replacement complete!');
console.log('📝 Logger utility will automatically disable logs in production builds.');
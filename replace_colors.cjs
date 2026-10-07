const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

let changedFiles = 0;

files.forEach(file => {
  if (file === 'Layout.tsx') return;

  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('blue-')) {
    content = content.replace(/blue-/g, 'moura-orange-');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
    changedFiles++;
  }
});

console.log(`Done! Changed ${changedFiles} files.`);

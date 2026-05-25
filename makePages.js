const fs = require('fs');
const pages = ['Dashboard', 'RemoveBg', 'Converter', 'Resizer', 'Watermark', 'Exif', 'Palette', 'Settings', 'About'];

pages.forEach(p => {
  fs.writeFileSync(
    `renderer/src/pages/${p}.tsx`,
    `import React from 'react';\n\nexport default function ${p}Page(props: any) {\n  return (\n    <div className="page active">\n      <div className="h1">${p}</div>\n    </div>\n  );\n}\n`
  );
});

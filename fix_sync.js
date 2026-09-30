const fs = require('fs');

let content = fs.readFileSync('app/api/sales/route.ts', 'utf8');

content = content.replace(
  `const saleId = body.id || randomUUID()`,
  `const saleId = body.id || overrideData?.id || randomUUID()`
);

fs.writeFileSync('app/api/sales/route.ts', content);

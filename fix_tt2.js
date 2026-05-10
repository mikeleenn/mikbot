const fs = require('fs');
let a = fs.readFileSync('bot.js','utf8');
a = a.replace(
'const link=args.slice(1).join(''');
',
"const link=texto.slice(4);"
);
fs.writeFileSync('bot.js', a);
console.log('✅ /tt arreglado con texto.slice');

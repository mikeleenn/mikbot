const fs = require('fs');
let a = fs.readFileSync('bot.js','utf8');

const acciones = [
  { cmd: 'abrazar', texto: 'abrazó a' },
  { cmd: 'besar', texto: 'besó a' },
  { cmd: 'pegar', texto: 'golpeó a' },
  { cmd: 'patada', texto: 'le dio una patada a' },
  { cmd: 'matar', texto: 'eliminó a' },
  { cmd: 'ignorar', texto: 'ignoró a' },
  { cmd: 'llorar', texto: 'está llorando' } // sin target
];

acciones.forEach(({cmd, texto}) => {
  // Busca el bloque de la acción actual (el que crea imagen con ImageMagick)
  const regexViejo = new RegExp(
    `if\\(cmd===PREFIX\\+'${cmd}'\\)\\{[\\s\\S]*?return;\\n\\}`,
    'g'
  );

  const necesitaTarget = cmd !== 'llorar';
  const nuevoBloque = `if(cmd===PREFIX+'${cmd}'){
let target=mencionados.length>0?mencionados[0]:null;
${necesitaTarget ? `if(!target)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎬 *${cmd.toUpperCase()}*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n❌ Menciona a alguien\\n📌 Ejemplo: /${cmd} @tag'});` : ''}
const path='/storage/emulated/0/Pictures/acciones/${cmd}.gif';
if(fs.existsSync(path)){
const gifBuffer = fs.readFileSync(path);
await sock.sendMessage(grupo,{
  gif: gifBuffer,
  caption:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎬 *${cmd.toUpperCase()}*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n'+mencion(sender)+' ${texto}${necesitaTarget ? ' '+mencion(target) : ''}',
  mentions:[sender${necesitaTarget ? ',target' : ''}]
});
}else{
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ ⚠️ *${cmd.toUpperCase()}*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n❌ GIF no encontrado: ${cmd}.gif\\n📌 Ponlo en /storage/emulated/0/Pictures/acciones/'});
}
return;
}`;

  a = a.replace(regexViejo, nuevoBloque);
});

fs.writeFileSync('bot.js', a);
console.log('✅ Acciones actualizadas para usar GIFs locales');

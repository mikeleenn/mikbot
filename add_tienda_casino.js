const fs = require('fs');
let a = fs.readFileSync('bot.js', 'utf8');

// 1. Agregar inventario, escudoAntiRobo, picoMejorado, monedero, boostXP a getDB
a = a.replace(/crimeCooldown:\{\},mikbank:/g, "crimeCooldown:{},inventario:{},escudoAntiRobo:{},picoMejorado:{},monedero:{},boostXP:{},loteria:{},mikbank:");

// 2. Agregar función para verificar items
const funcionItems = `
// Verificar si tiene escudo anti-robo
function tieneEscudo(uid){d.escudoAntiRobo=d.escudoAntiRobo||{};return d.escudoAntiRobo[uid]&&Date.now()<d.escudoAntiRobo[uid];}
`;

// Insertar la función después de addXp30
a = a.replace(
"async function addXp30(){",
funcionItems + "async function addXp30(){"
);

// 3. Modificar /robar para que respete el escudo
a = a.replace(
"if(cashVictima<10)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🦹 *ROBAR*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n❌ '+mencion(t)+' no tiene suficientes MikCoins en mano\\n💡 Su dinero en el banco está protegido',mentions:[t]});",
"if(tieneEscudo(tuid))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🦹 *ROBAR*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n🛡️ '+mencion(t)+' tiene escudo anti-robo\\n❌ No puedes robarle',mentions:[t]});\nif(cashVictima<10)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🦹 *ROBAR*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n❌ '+mencion(t)+' no tiene suficientes MikCoins en mano\\n💡 Su dinero en el banco está protegido',mentions:[t]});"
);

// 4. Agregar comandos de tienda y casino después de rank
const buscarRank = "await sock.sendMessage(grupo,{text:texto,mentions:ranking.map(r=>r[0]+'@s.whatsapp.net')});\nreturn;\n}\n\n`";

const nuevosComandos = buscarRank.replace('return;\n}\n\n`', `return;
}

if(cmd===PREFIX+'tienda'){
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🏪 *TIENDA MIKCOINS*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n🛡️ Escudo anti-robo - 500 MC\\n`Protege de robos por 24h`\\n\\n⛏️ Pico mejorado - 300 MC\\n`Duplica /minar x3 usos`\\n\\n💰 Monedero - 200 MC\\n`+10%% en /work`\\n\\n🌟 Boost XP - 400 MC\\n`Doble XP por 1 hora`\\n\\n🎫 Lotería - 100 MC\\n`Ticket para sorteo`\\n\\n💡 /comprar (item) para comprar'});
return;
}

if(cmd===PREFIX+'comprar'){
const item=args[1]?.toLowerCase();
if(!item)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🏪 *COMPRAR*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n❌ Usa: /comprar (item)\\n💡 /tienda para ver items'});
const uid=sender.split('@')[0];
d.mikcoins=d.mikcoins||{};
const precios={escudo:500,pico:300,monedero:200,boost:400,loteria:100};
const nombres={escudo:'🛡️ Escudo anti-robo',pico:'⛏️ Pico mejorado',monedero:'💰 Monedero',boost:'🌟 Boost XP',loteria:'🎫 Lotería'};
if(!precios[item])return await sock.sendMessage(grupo,{text:'❌ Item no encontrado. /tienda'});
if((d.mikcoins[uid]||0)<precios[item])return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ ❌ *COMPRAR*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n💰 Te faltan '+(precios[item]-(d.mikcoins[uid]||0))+' MikCoins\\n💡 /minar para ganar más'});
d.mikcoins[uid]-=precios[item];
const ahora=Date.now();
if(item==='escudo'){d.escudoAntiRobo=d.escudoAntiRobo||{};d.escudoAntiRobo[uid]=ahora+86400000;}
if(item==='pico'){d.picoMejorado=d.picoMejorado||{};d.picoMejorado[uid]=(d.picoMejorado[uid]||0)+3;}
if(item==='monedero'){d.monedero=d.monedero||{};d.monedero[uid]=true;}
if(item==='boost'){d.boostXP=d.boostXP||{};d.boostXP[uid]=ahora+3600000;}
if(item==='loteria'){d.loteria=d.loteria||{};d.loteria[uid]=(d.loteria[uid]||0)+1;}
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ ✅ *COMPRA*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n✅ Compraste '+nombres[item]+'\\n💰 Te costó '+precios[item]+' MikCoins\\n💸 Saldo: '+(d.mikcoins[uid]||0),mentions:[sender]});
return;
}

if(cmd===PREFIX+'inventario'){
const uid=sender.split('@')[0];
d.escudoAntiRobo=d.escudoAntiRobo||{};d.picoMejorado=d.picoMejorado||{};d.monedero=d.monedero||{};d.boostXP=d.boostXP||{};d.loteria=d.loteria||{};
let inv='╭━━━━━━━━━━━━━━━⊷\\n┃ 🎒 *INVENTARIO*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n';
if(d.escudoAntiRobo[uid]&&Date.now()<d.escudoAntiRobo[uid]){const h=Math.ceil((d.escudoAntiRobo[uid]-Date.now())/3600000);inv+='🛡️ Escudo: '+h+'h restantes\\n';}else inv+='🛡️ Escudo: ❌\\n';
inv+='⛏️ Pico mejorado: '+(d.picoMejorado[uid]||0)+' usos\\n';
inv+='💰 Monedero: '+(d.monedero[uid]?'✅ activo':'❌')+'\\n';
if(d.boostXP[uid]&&Date.now()<d.boostXP[uid]){const m=Math.ceil((d.boostXP[uid]-Date.now())/60000);inv+='🌟 Boost XP: '+m+'min restantes\\n';}else inv+='🌟 Boost XP: ❌\\n';
inv+='🎫 Lotería: '+(d.loteria[uid]||0)+' tickets\\n\\n💡 /tienda para comprar más';
await sock.sendMessage(grupo,{text:inv,mentions:[sender]});
return;
}

if(cmd===PREFIX+'slot'){
const cantidad=parseInt(args[1]);
if(!cantidad||cantidad<10)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎰 *SLOT*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n❌ Apuesta mínima: 10 MC\\n📌 /slot (cantidad)'});
const uid=sender.split('@')[0];
d.mikcoins=d.mikcoins||{};
if((d.mikcoins[uid]||0)<cantidad)return await sock.sendMessage(grupo,{text:'❌ No tienes suficientes MikCoins'});
d.mikcoins[uid]-=cantidad;
const emojis=['🍒','🍋','🍊','🍇','💎','7️⃣'];
const r1=emojis[Math.floor(Math.random()*emojis.length)];
const r2=emojis[Math.floor(Math.random()*emojis.length)];
const r3=emojis[Math.floor(Math.random()*emojis.length)];
let premio=0,msj='';
if(r1===r2&&r2===r3){
if(r1==='💎'){premio=cantidad*10;msj='🎉 JACKPOT! x10';}
else if(r1==='7️⃣'){premio=cantidad*5;msj='🎉 PREMIO MAYOR! x5';}
else{premio=cantidad*3;msj='✅ Ganaste! x3';}
}else if(r1===r2||r2===r3||r1===r3){premio=Math.floor(cantidad*1.5);msj='🎲 Casi! x1.5';}
else{premio=0;msj='😢 Perdiste';}
d.mikcoins[uid]+=premio;
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎰 *SLOT*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n🎰 '+r1+' | '+r2+' | '+r3+'\\n📊 '+msj+'\\n💰 Premio: '+premio+' MC\\n💸 Saldo: '+d.mikcoins[uid],mentions:[sender]});
return;
}

if(cmd===PREFIX+'ruletamik'){
const cantidad=parseInt(args[1]);
const color=args[2]?.toLowerCase();
if(!cantidad||cantidad<10||!color||(color!=='rojo'&&color!=='negro'))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎡 *RULETA*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n❌ /ruletamik (cantidad) (rojo/negro)\\n📌 Mínimo 10 MC'});
const uid=sender.split('@')[0];
d.mikcoins=d.mikcoins||{};
if((d.mikcoins[uid]||0)<cantidad)return await sock.sendMessage(grupo,{text:'❌ No tienes suficientes MikCoins'});
d.mikcoins[uid]-=cantidad;
const resultado=Math.random()<0.5?'rojo':'negro';
if(color===resultado){
d.mikcoins[uid]+=cantidad*2;
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎡 *RULETA*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n🔴🔵 Salió: '+resultado+'\\n✅ Ganaste '+cantidad*2+' MC\\n💰 Saldo: '+d.mikcoins[uid],mentions:[sender]});
}else{
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎡 *RULETA*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n🔴🔵 Salió: '+resultado+'\\n😢 Perdiste '+cantidad+' MC\\n💰 Saldo: '+d.mikcoins[uid],mentions:[sender]});
}
return;
}

if(cmd===PREFIX+'dados'){
const cantidad=parseInt(args[1]);
const numero=parseInt(args[2]);
if(!cantidad||cantidad<10||!numero||numero<1||numero>6)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎲 *DADOS*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n❌ /dados (cantidad) (1-6)\\n📌 Mínimo 10 MC'});
const uid=sender.split('@')[0];
d.mikcoins=d.mikcoins||{};
if((d.mikcoins[uid]||0)<cantidad)return await sock.sendMessage(grupo,{text:'❌ No tienes suficientes MikCoins'});
d.mikcoins[uid]-=cantidad;
const dado=Math.floor(Math.random()*6)+1;
if(numero===dado){
d.mikcoins[uid]+=cantidad*5;
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎲 *DADOS*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n🎲 Salió: '+dado+'\\n✅ Acertaste! Ganaste '+cantidad*5+' MC\\n💰 Saldo: '+d.mikcoins[uid],mentions:[sender]});
}else{
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\\n┃ 🎲 *DADOS*\\n╰━━━━━━━━━━━━━━━⬣\\n\\n🎲 Salió: '+dado+'\\n😢 Fallaste. Perdiste '+cantidad+' MC\\n💰 Saldo: '+d.mikcoins[uid],mentions:[sender]});
}
return;
}

`);

a = a.replace(buscarRank, nuevosComandos);

// 5. Agregar a permisos
a = a.replace(
"cmd!==PREFIX+'crime'",
"cmd!==PREFIX+'crime'&&cmd!==PREFIX+'tienda'&&cmd!==PREFIX+'comprar'&&cmd!==PREFIX+'inventario'&&cmd!==PREFIX+'slot'&&cmd!==PREFIX+'ruletamik'&&cmd!==PREFIX+'dados'"
);

// 6. Actualizar menú de economía
a = a.replace(
'┃ 💰 /crime\\n' +
'┃ \\`Crimen cada 2 horas\\`\\n',
'┃ 💰 /crime\\n' +
'┃ \\`Crimen cada 2 horas\\`\\n' +
'┃ 💰 /tienda\\n' +
'┃ \\`Compra items útiles\\`\\n' +
'┃ 💰 /comprar (item)\\n' +
'┃ \\`Adquiere un item\\`\\n' +
'┃ 💰 /inventario\\n' +
'┃ \\`Ve tus items comprados\\`\\n' +
'┃ 💰 /slot (cantidad)\\n' +
'┃ \\`Tragamonedas de casino\\`\\n' +
'┃ 💰 /ruletamik (cantidad) (rojo/negro)\\n' +
'┃ \\`Ruleta de casino\\`\\n' +
'┃ 💰 /dados (cantidad) (1-6)\\n' +
'┃ \\`Apuesta a un número\\`\\n'
);

// 7. Actualizar total comandos (76 + 6 = 82)
a = a.replace(/const totalComandos=76;/, 'const totalComandos=82;');

fs.writeFileSync('bot.js', a);
console.log('✅ Tienda, casino y items funcionales (82 comandos)');

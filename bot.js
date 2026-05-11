const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { LocalStorage } = require('node-localstorage');
const db = new LocalStorage('./database');
const axios = require('axios');
const fetch = require('node-fetch');
const yts = require('yt-search');
const fs = require('fs');
const ecoModule = require('./mikcoins.js');
function getDB(k,d){const data=db.getItem(k);return data?JSON.parse(data):d;}
function setDB(k,v){db.setItem(k,JSON.stringify(v));}
const PREFIX='/';
function getXpNecesario(n){return n*100;}

const cacheMetadata = {};
async function getMetadata(sock, grupo) {
    const ahora = Date.now();
    if (cacheMetadata[grupo] && (ahora - cacheMetadata[grupo].time) < 60000) return cacheMetadata[grupo].data;
    try { const meta = await sock.groupMetadata(grupo); cacheMetadata[grupo] = { data: meta, time: ahora }; return meta; }
    catch(e) { return cacheMetadata[grupo]?.data || { participants: [] }; }
}

async function iniciarBot(){
const{state,saveCreds}=await useMultiFileAuthState('sesion_mikbot');
const sock=makeWASocket({auth:state,printQRInTerminal:false});
sock.ev.on('connection.update',(u)=>{
const{connection,lastDisconnect,qr}=u;
if(qr){qrcode.generate(qr,{small:true});console.log('Escanea QR');}
if(connection==='open')console.log('MikBot conectado');
if(connection==='close'){if(lastDisconnect.error?.output?.statusCode!==DisconnectReason.loggedOut)iniciarBot();}
});
sock.ev.on('creds.update',saveCreds);

sock.ev.on('group-participants.update',async(u)=>{
const g=u.id;
const d=getDB(g,{warns:{},muted:[],modoadmins:false,banbot:[],antispam:false,antilinks:false,antistickers:false,antiimg:false,antivideos:false,antiaudios:false,welcome:false,despedida:false,welcomeMsg:'',despedidaMsg:'',autoreact:'',autoreactUser:'',xp:{},nivel:{},wordle:null,ahorcado:null,ruleta:null,trivia:null,mikcoins:{},mikbank:{},dailyCooldown:{},minarCooldown:{},workCooldown:{},crimeCooldown:{},robarCooldown:{},deuda:{},escudoAntiRobo:{},picoMejorado:{},monedero:{},boostXP:{},loteria:{},mochila:{},picoDiamante:{}});
if(u.action==='add'&&d.welcome){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];let msgB=d.welcomeMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *BIENVENIDO/A*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n✅ Bienvenido al grupo\n📌 Respeta las reglas';msgB=msgB.replace(/@user/g,'@'+num);await sock.sendMessage(g,(()=>{try{return {image:fs.readFileSync('/storage/emulated/0/Pictures/bienvenidabot.png'),caption:msgB,mentions:[jid]}}catch(e){return {text:msgB,mentions:[jid]}}})()).catch(async()=>{await sock.sendMessage(g,{text:msgB,mentions:[jid]});});}}
if(u.action==='remove'&&d.despedida){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];let msgD=d.despedidaMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 👋 *ADIÓS*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n😢 Salió del grupo';msgD=msgD.replace(/@user/g,'@'+num);await sock.sendMessage(g,{image:fs.readFileSync('/storage/emulated/0/Pictures/1778101076566.png'),caption:msgD,mentions:[jid]}).catch(async()=>{await sock.sendMessage(g,{text:msgD,mentions:[jid]});});}}
});

const spamTracker={};
sock.ev.on('messages.upsert',async(m)=>{
const mensaje=m.messages[0];
if(!mensaje.message)return;
const grupo=mensaje.key.remoteJid;
const sender=mensaje.key.participant||mensaje.key.remoteJid;
const d=getDB(grupo,{warns:{},muted:[],modoadmins:false,banbot:[],antispam:false,antilinks:false,antistickers:false,antiimg:false,antivideos:false,antiaudios:false,welcome:false,despedida:false,welcomeMsg:'',despedidaMsg:'',autoreact:'',autoreactUser:'',xp:{},nivel:{},wordle:null,ahorcado:null,ruleta:null,trivia:null,mikcoins:{},mikbank:{},dailyCooldown:{},minarCooldown:{},workCooldown:{},crimeCooldown:{},robarCooldown:{},deuda:{},escudoAntiRobo:{},picoMejorado:{},monedero:{},boostXP:{},loteria:{},mochila:{},picoDiamante:{}});
const ahora=Date.now();
const texto=mensaje.message.conversation||mensaje.message.extendedTextMessage?.text||'';

if(d.autoreact&&d.autoreactUser===sender.split('@')[0]){try{await sock.sendMessage(grupo,{react:{text:d.autoreact,key:mensaje.key}});}catch(e){}}
if(d.muted.includes(sender)&&!mensaje.key.fromMe){await sock.sendMessage(grupo,{delete:mensaje.key});return;}
let metadata={participants:[]};try{metadata=await getMetadata(sock,grupo);}catch(e){}
const admins=metadata.participants.filter(p=>p.admin).map(p=>p.id);
const isSenderAdmin=admins.includes(sender);
if(!texto)return;
function addWarn(t){d.warns[t]=(d.warns[t]||0)+1;setDB(grupo,d);return d.warns[t];}
async function checkExpulsar(t){if(d.warns[t]>=3){try{await sock.groupParticipantsUpdate(grupo,[t],'remove');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *EXPULSIÓN*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+t.split('@')[0]+'\n📊 Acumuló 3 warns y fue expulsado',mentions:[t]});}catch(e){}return true;}return false;}

if(d.antispam&&!isSenderAdmin&&!mensaje.key.fromMe){if(!spamTracker[sender])spamTracker[sender]=[];spamTracker[sender]=spamTracker[sender].filter(t=>ahora-t<10000);spamTracker[sender].push(ahora);if(spamTracker[sender].length>=4){spamTracker[sender]=[];const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTISPAM*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Motivo: Muchos mensajes en poco tiempo',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}}
if(d.antilinks&&!isSenderAdmin&&!mensaje.key.fromMe&&/https?:\/\/[^\s]+/i.test(texto)){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTILINKS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Motivo: Envío de enlaces',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antistickers&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.stickerMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTISTICKERS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Motivo: Envío de stickers',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antiimg&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.imageMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIIMG*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Motivo: Envío de imágenes',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antivideos&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.videoMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIVIDEOS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Motivo: Envío de videos',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antiaudios&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.audioMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIAUDIOS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Motivo: Envío de audios',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}

if(d.banbot.includes(sender)&&texto.startsWith(PREFIX))return;
let mencionados=mensaje.message.extendedTextMessage?.contextInfo?.mentionedJid||[];
const qs=mensaje.message.extendedTextMessage?.contextInfo?.participant;
if(mencionados.length===0&&qs)mencionados=[qs];
function mencion(uid){return'@'+uid.split('@')[0];}

const args=texto.split(' ');
const cmd=args[0].toLowerCase();
const totalComandos=76;

async function addXpBD(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+10;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nuevo nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp20(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+20;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nuevo nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp30(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+30;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nuevo nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}

const eco = ecoModule(sock, getDB, setDB, PREFIX);
const ecoResp = await eco.handleCommand(cmd, args, d, grupo, sender, mencionados, mencion);
if(ecoResp){if(ecoResp.text)await sock.sendMessage(grupo,{text:ecoResp.text,mentions:ecoResp.mentions||[sender]});setDB(grupo,d);return;}
if(texto===PREFIX+'menu'){
const num=sender.split('@')[0];
const nivelUsuario=(d.nivel&&d.nivel[num])||1;
const xpUsuario=(d.xp&&d.xp[num])||0;
const xpNecesario=nivelUsuario*100;
const menu="╭━━〔 👑 𝑴𝑰𝑲𝑩𝑶𝑻 👑 〕━━⊷\n┃ 👤 Usuario: @"+num+"\n┃ 🤖 Versión: Beta\n┃ 🧠 Comandos: "+totalComandos+"\n┃ 🏆 Nivel: "+nivelUsuario+"\n┃ ✨ XP: "+xpUsuario+"/"+xpNecesario+"\n┃ 💰 MikCoins: "+(d.mikcoins&&d.mikcoins[num]?d.mikcoins[num]:0)+"\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 ⚙️ CONFIGURACIÓN 〕━━⊷\n┃ ⚙️ /welcome on/off\n┃ `Activa/desactiva bienvenidas`\n┃ ⚙️ /despedida on/off\n┃ `Activa/desactiva despedidas`\n┃ ⚙️ /setwelcome (mensaje)\n┃ `Personaliza la bienvenida`\n┃ ⚙️ /setdespedida (mensaje)\n┃ `Personaliza la despedida`\n┃ ⚙️ /welcomepredeterminado\n┃ `Restaura bienvenida por defecto`\n┃ ⚙️ /despedidapredeterminada\n┃ `Restaura despedida por defecto`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 👑 ADMINISTRACIÓN 〕━━⊷\n┃ 👑 /promote @tag\n┃ `Da admin al usuario`\n┃ 👑 /demote @tag\n┃ `Quita admin al usuario`\n┃ 👑 /cerrar\n┃ `Cierra el grupo`\n┃ 👑 /abrir\n┃ `Abre el grupo`\n┃ 👑 /kick @tag\n┃ `Expulsa al usuario`\n┃ 👑 /mute @tag\n┃ `Silencia al usuario`\n┃ 👑 /unmute @tag\n┃ `Desilencia al usuario`\n┃ 👑 /warn @tag\n┃ `Advierte al usuario`\n┃ 👑 /unwarn @tag\n┃ `Quita advertencia`\n┃ 👑 /warnlist\n┃ `Lista de advertencias`\n┃ 👑 /hide\n┃ `Elimina mensaje respondido`\n┃ 👑 /modoadmins on/off\n┃ `Solo admins usan el bot`\n┃ 👑 /banbot @tag\n┃ `Banea del bot`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🛡️ PROTECCIÓN 〕━━⊷\n┃ 🛡 /antispam on/off\n┃ `4 msg en 10s = warn`\n┃ 🛡 /antilinks on/off\n┃ `Warn por links`\n┃ 🛡 /antistickers on/off\n┃ `Warn por stickers`\n┃ 🛡 /antiimg on/off\n┃ `Warn por imágenes`\n┃ 🛡 /antivideos on/off\n┃ `Warn por videos`\n┃ 🛡 /antiaudios on/off\n┃ `Warn por audios`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🎮 JUEGOS Y DIVERSIÓN 〕━━⊷\n┃ 🎮 /8ball (pregunta)\n┃ `La bola mágica`\n┃ 🎮 /dado\n┃ `Lanza un dado`\n┃ 🎮 /moneda\n┃ `Cara o cruz`\n┃ 🎮 /random (min) (max)\n┃ `Número aleatorio`\n┃ 🎮 /verdadoreto\n┃ `Verdad o reto`\n┃ 🎮 /top10 (tema)\n┃ `Top 10 aleatorio`\n┃ 🎮 /autoreact (emoji) on/off\n┃ `Reacciona a tus msgs`\n┃ 🎮 /gay @tag\n┃ `% de qué tan gay eres`\n┃ 🎮 /iq @tag\n┃ `% de tu IQ`\n┃ 🎮 /wordle\n┃ `Adivina la palabra`\n┃ 🎮 /ahorcado\n┃ `Juego del ahorcado`\n┃ 🎮 /ruleta\n┃ `Ruleta rusa`\n┃ 🎮 /trivia\n┃ `Preguntas de trivia`\n┃ 🎮 /ppt (piedra/papel/tijera)\n┃ `Juega contra el bot`\n┃ 🎮 /batalla @tag\n┃ `Pelea contra alguien`\n┃ 🎮 /ship @tag1 @tag2\n┃ `Porcentaje de amor`\n┃ 🎮 /pareja\n┃ `Pareja aleatoria`\n┃ 🎮 /chiste\n┃ `Chiste aleatorio`\n┃ 🎮 /frase\n┃ `Frase motivacional`\n┃ 🎮 /piropo\n┃ `Piropo aleatorio`\n┃ 🎮 /insulto @tag\n┃ `Insulto gracioso`\n┃ 🎮 /consejo\n┃ `Consejo para la vida`\n┃ 🎮 /dato\n┃ `Dato curioso`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 💰 ECONOMÍA 〕━━⊷\n┃ 💰 /daily\n┃ `100 MC cada 24h`\n┃ 💰 /minar\n┃ `Gana 10-100 cada 30 min`\n┃ 💰 /work\n┃ `Trabaja cada 1 hora`\n┃ 💰 /crime\n┃ `Crimen cada 2 horas`\n┃ 💰 /banco\n┃ `Ve tu saldo`\n┃ 💰 /depositar (cantidad/all)\n┃ `Guarda en el banco`\n┃ 💰 /sacar (cantidad/all)\n┃ `Retira del banco`\n┃ 💰 /robar @tag\n┃ `Roba cada 10 min`\n┃ 💰 /regalar @tag (cantidad)\n┃ `Regala MC`\n┃ 💰 /prestamo (cantidad)\n┃ `Pide préstamo (máx 500)`\n┃ 💰 /pagar (cantidad/all)\n┃ `Paga tu deuda`\n┃ 💰 /deuda\n┃ `Consulta tu deuda`\n┃ 💰 /tienda\n┃ `Compra items útiles`\n┃ 💰 /comprar (item)\n┃ `Adquiere un item`\n┃ 💰 /inventario\n┃ `Ve tus items`\n┃ 💰 /slot (cantidad)\n┃ `Tragamonedas`\n┃ 💰 /ruletamik (cantidad) (rojo/negro)\n┃ `Ruleta de casino`\n┃ 💰 /dados (cantidad) (1-6)\n┃ `Apuesta a un número`\n┃ 💰 /rank\n┃ `Ranking de los más ricos`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 📥 DESCARGAS 〕━━⊷\n┃ 📥 /spotify (texto)\n┃ `Envía audio de Spotify`\n┃ 📥 /play (texto)\n┃ `Envía video de YouTube`\n┃ 📥 /playaudio (texto)\n┃ `Envía audio de YouTube`\n┃ 📥 /tt (link)\n┃ `Descarga TikTok sin marca`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 📸 STICKERS 〕━━⊷\n┃ 📸 /nuevos comandos próximamente\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🎬 ACCIONES 〕━━⊷\n┃ 🎬 /nuevos comandos próximamente\n╰━━━━━━━━━━━━━━━━━━━⬣\n\nBy: Mikbot | By: mikelennn | By: 2941160601";
await sock.sendMessage(grupo,{image:fs.readFileSync('/storage/emulated/0/Pictures/1777754412038.png'),caption:menu,mentions:[sender]}).catch(async()=>{await sock.sendMessage(grupo,{text:menu,mentions:[sender]});});
await sock.sendMessage(grupo,{text:'📢 Canal: https://whatsapp.com/channel/0029Vb8Z3WqI7BeJbYIJHm20'});
await addXpBD();return;
}


// JUEGOS NUEVOS
if(cmd===PREFIX+'ppt'){const opciones=['piedra','papel','tijera'];const user=args[1]?.toLowerCase();if(!user||!opciones.includes(user))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✊ *PPT*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Elige: /ppt piedra/papel/tijera'});const bot=opciones[Math.floor(Math.random()*3)];let r='';if(user===bot)r='🤝 Empate';else if((user==='piedra'&&bot==='tijera')||(user==='papel'&&bot==='piedra')||(user==='tijera'&&bot==='papel'))r='🎉 Ganaste';else r='😢 Perdiste';await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✊ *PPT*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 Tú: '+user+'\n🤖 Bot: '+bot+'\n'+r,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'batalla'){const t=mencionados[0];if(!t)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚔️ *BATALLA*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Menciona a alguien\n📌 /batalla @tag'});const p1=Math.floor(Math.random()*1000)+1,p2=Math.floor(Math.random()*1000)+1;await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚔️ *BATALLA*\n╰━━━━━━━━━━━━━━━⬣\n\n'+mencion(sender)+': '+p1+'⚡\n'+mencion(t)+': '+p2+'⚡\n\n🏆 Ganador: '+(p1>p2?mencion(sender):mencion(t)),mentions:[sender,t]});await addXpBD();return;}
if(cmd===PREFIX+'ship'){const t1=mencionados[0],t2=mencionados[1];if(!t1||!t2)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💕 *SHIP*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Menciona 2 personas\n📌 /ship @tag1 @tag2'});const p=Math.floor(Math.random()*101);const e=p>80?'💖💘':p>50?'💕':p>20?'🤔':'💔';await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💕 *SHIP*\n╰━━━━━━━━━━━━━━━⬣\n\n'+mencion(t1)+' + '+mencion(t2)+'\n📊 '+p+'% '+e,mentions:[t1,t2]});await addXpBD();return;}
if(cmd===PREFIX+'pareja'){const ps=metadata.participants.map(p=>p.id);const a=ps[Math.floor(Math.random()*ps.length)],b=ps[Math.floor(Math.random()*ps.length)];const p=Math.floor(Math.random()*101);const e=p>80?'💖':p>50?'💕':'💔';await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💑 *PAREJA RANDOM*\n╰━━━━━━━━━━━━━━━⬣\n\n'+mencion(a)+' 💍 '+mencion(b)+'\n📊 '+p+'% '+e,mentions:[a,b]});await addXpBD();return;}
if(cmd===PREFIX+'chiste'){const chistes=['¿Qué hace una abeja en el gimnasio? ¡Zum-ba!','Era tan pobre que no tenía ni sombra','¿Cómo se despiden los químicos? Ácido un placer','¿Qué le dice un techo a otro? ¡Techo de menos!','¿Qué hace un pez? ¡Nada!','¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter','¿Cómo se llama un boomerang que no vuelve? Palo','¿Qué hace un pato con una pata? Cojea','¿Por qué los esqueletos no pelean? No tienen agallas','¿Qué le dice un .jpg a un .png? ¡Qué comprimido te veo!'];const c=chistes[Math.floor(Math.random()*10)];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 😂 *CHISTE*\n╰━━━━━━━━━━━━━━━⬣\n\n'+c,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'frase'){const frases=['El éxito es la suma de pequeños esfuerzos','La vida es 10% lo que te pasa y 90% cómo reaccionas','Cree en ti mismo y todo será posible','El único modo de hacer un gran trabajo es amar lo que haces','Cada día es una nueva oportunidad','Nunca es demasiado tarde','La felicidad viene de tus propias acciones','No cuentes los días, haz que los días cuenten','Donde hay educación no hay distinción','La imaginación es más importante que el conocimiento'];const f=frases[Math.floor(Math.random()*10)];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💭 *FRASE*\n╰━━━━━━━━━━━━━━━⬣\n\n⭐ '+f,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'piropo'){const piropos=['Eres tan bella que hiciste que el sol se esconda','Si la belleza fuera tiempo, tú serías la eternidad','Quisiera ser astronauta para explorar el universo de tus ojos','Eres como el WiFi, todos quieren conectarse','Si besar fuera pecado, caminaría feliz por el infierno','Eres más dulce que un caramelo','Tus ojos son como el mar, me pierdo en ellos','Eres como un sueño del que no quiero despertar','Tu sonrisa ilumina más que mil estrellas','Contigo aprendí que los ángeles sí existen'];const p=piropos[Math.floor(Math.random()*10)];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💋 *PIROPO*\n╰━━━━━━━━━━━━━━━⬣\n\n💕 '+p,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'insulto'){const t=mencionados[0];if(!t)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🤬 *INSULTO*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Menciona a alguien\n📌 /insulto @tag'});const insultos=['Eres más inútil que un paraguas en un huracán','Eres más falso que un billete de 3 pesos','Tienes menos luces que un árbol apagado','Eres más lento que una tortuga','Tienes menos cerebro que un mosquito','Eres más aburrido que un documental de caracoles','Eres más frío que el corazón de tu ex','Tienes menos futuro que un hielo en el desierto','Eres más falso que una sonrisa de político','Tienes menos gracia que un chiste mal contado'];const i=insultos[Math.floor(Math.random()*10)];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🤬 *INSULTO*\n╰━━━━━━━━━━━━━━━⬣\n\n😈 '+mencion(t)+': '+i,mentions:[t]});await addXpBD();return;}
if(cmd===PREFIX+'consejo'){const consejos=['No dejes para mañana lo que puedas hacer hoy','Aprende algo nuevo cada día','Escucha más de lo que hablas','Viaja siempre que puedas','Sé amable con todos','Ahorra aunque sea un poco','Bebe más agua','Haz ejercicio 15 min al día','Lee libros, expanden la mente','Nunca es tarde para empezar'];const c=consejos[Math.floor(Math.random()*10)];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💡 *CONSEJO*\n╰━━━━━━━━━━━━━━━⬣\n\n🌟 '+c,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'dato'){const datos=['Los pulpos tienen 3 corazones','El sol es 330,000 veces más grande que la Tierra','Las abejas reconocen rostros humanos','El agua caliente se congela más rápido que la fría','Los flamingos son rosados por lo que comen','El Everest crece 4mm al año','La lengua es el músculo más fuerte','Los delfines duermen con un ojo abierto','El corazón late 100,000 veces al día','Las hormigas no duermen'];const d=datos[Math.floor(Math.random()*10)];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 📚 *DATO CURIOSO*\n╰━━━━━━━━━━━━━━━⬣\n\n🧠 '+d,mentions:[sender]});await addXpBD();return;}

// SPOTIFY
if(cmd===PREFIX+'spotify'){
const query=texto.slice(9);
if(!query)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎵 *SPOTIFY*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Usa: /spotify (nombre de canción)'});
try{
const key='sasuke';
const sr=await axios.get('https://api.evogb.org/search/spotify?query='+encodeURIComponent(query)+'&key='+key);
if(!sr.data.status||!sr.data.result.length)return await sock.sendMessage(grupo,{text:'❌ No encontrado'});
const t=sr.data.result[0];
const dr=await axios.get('https://api.evogb.org/dl/spotify?url='+encodeURIComponent('https://open.spotify.com/track/'+t.id)+'&key='+key);
if(!dr.data.status)return await sock.sendMessage(grupo,{text:'❌ Error al descargar'});
const dt=dr.data.data;
await sock.sendMessage(grupo,{image:{url:dt.imageHD||dt.image},caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎵 *SPOTIFY*\n╰━━━━━━━━━━━━━━━⬣\n\n🎵 '+dt.name+'\n👤 '+dt.artist+'\n💿 '+dt.album+'\n⏱️ '+dt.duration});
await sock.sendMessage(grupo,{audio:{url:dt.url},mimetype:'audio/mpeg',fileName:dt.name+'.mp3'});
}catch(e){await sock.sendMessage(grupo,{text:'❌ Spotify no disponible'});}
return;
}

// PLAY VIDEO
if(cmd===PREFIX+'play'){
const busqueda=texto.slice(6);
if(!busqueda)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎬 *YOUTUBE*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Usa: /play (nombre del video)'});
try{
let vu=busqueda;
if(!busqueda.match(/youtu/gi)){const r=await yts(busqueda);if(!r.all.length)return await sock.sendMessage(grupo,{text:'❌ Sin resultados'});vu=r.videos[0].url;}
const api='https://api.delirius.store/download/ytmp4?url='+encodeURIComponent(vu)+'&format=360p';
const res=await fetch(api);const json=await res.json();
if(!json.status||!json.data)return await sock.sendMessage(grupo,{text:'❌ Error al descargar'});
await sock.sendMessage(grupo,{video:{url:json.data.download},caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎬 *VIDEO*\n╰━━━━━━━━━━━━━━━⬣\n\n🎬 '+json.data.title,mimetype:'video/mp4'});
}catch(e){await sock.sendMessage(grupo,{text:'❌ Error: '+e.message});}
return;
}

// PLAY AUDIO
if(cmd===PREFIX+'playaudio'){
const busqueda=texto.slice(11);
if(!busqueda)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎵 *AUDIO YT*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Usa: /playaudio (nombre de canción)'});
try{
let vu=busqueda;
if(!busqueda.match(/youtu/gi)){const r=await yts(busqueda);if(!r.all.length)return await sock.sendMessage(grupo,{text:'❌ Sin resultados'});vu=r.videos[0].url;}
const api='https://api.delirius.store/download/ytmp3?url='+encodeURIComponent(vu);
const res=await fetch(api);const json=await res.json();
if(!json.status||!json.data)return await sock.sendMessage(grupo,{text:'❌ Error al descargar'});
await sock.sendMessage(grupo,{image:{url:json.data.image},caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎵 *AUDIO*\n╰━━━━━━━━━━━━━━━⬣\n\n🎵 '+json.data.title+'\n👤 '+json.data.author});
await sock.sendMessage(grupo,{audio:{url:json.data.download},mimetype:'audio/mpeg',fileName:json.data.title+'.mp3'});
}catch(e){await sock.sendMessage(grupo,{text:'❌ Error: '+e.message});}
return;
}

// TIKTOK
if(cmd===PREFIX+'tt'){
const link=texto.slice(4);
if(!link)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎵 *TIKTOK*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Usa: /tt (link de TikTok)'});
await sock.sendMessage(grupo,{text:'⏳ Descargando TikTok...'});
const output='/storage/emulated/0/Download/tiktok_'+Date.now()+'.mp4';
const { exec } = require('child_process');
exec('python -m yt_dlp -o "'+output+'" "'+link+'"', async (err) => {
if(err){await sock.sendMessage(grupo,{text:'❌ Error al descargar TikTok'});return;}
await sock.sendMessage(grupo,{video:{url:output},caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎵 *TIKTOK*\n╰━━━━━━━━━━━━━━━⬣\n\n🎵 Descargado sin marca'});});
return;
}

// TRIVIA
if(cmd===PREFIX+'trivia'){
if(d.trivia)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ❓ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n❓ Ya hay una trivia activa\n💡 Responde: /rtrivia a/b/c/d'});
const preguntas=[{p:'¿Capital de Francia?',a:'Londres',b:'París',c:'Madrid',d:'Roma',r:'b'},{p:'¿Planetas del sistema solar?',a:'7',b:'9',c:'8',d:'10',r:'c'},{p:'¿Quién pintó la Mona Lisa?',a:'Picasso',b:'Van Gogh',c:'Da Vinci',d:'Dalí',r:'c'},{p:'¿Océano más grande?',a:'Atlántico',b:'Índico',c:'Ártico',d:'Pacífico',r:'d'},{p:'¿Año del hombre en la luna?',a:'1965',b:'1969',c:'1971',d:'1975',r:'b'},{p:'¿Animal más rápido?',a:'León',b:'Guepardo',c:'Águila',d:'Tiburón',r:'b'},{p:'¿Huesos del cuerpo humano?',a:'186',b:'196',c:'206',d:'216',r:'c'},{p:'¿País más grande?',a:'China',b:'EEUU',c:'Canadá',d:'Rusia',r:'d'},{p:'¿Autor de Romeo y Julieta?',a:'Cervantes',b:'Shakespeare',c:'Dante',d:'Homero',r:'b'},{p:'¿Elemento químico del agua?',a:'O2',b:'CO2',c:'H2O',d:'NaCl',r:'c'}];
const pr=preguntas[Math.floor(Math.random()*preguntas.length)];
d.trivia={correcta:pr.r,tiempo:Date.now()+30000,activo:true};
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ❓ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n📝 '+pr.p+'\n\n🅰️ '+pr.a+'\n🅱️ '+pr.b+'\n©️ '+pr.c+'\n🅳️ '+pr.d+'\n\n⏰ 30 segundos\n💡 /rtrivia a/b/c/d'});
return;
}
if(cmd===PREFIX+'rtrivia'&&d.trivia&&d.trivia.activo){
const resp=args[1]?.toLowerCase();
if(!resp||!['a','b','c','d'].includes(resp))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ❓ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Responde: /rtrivia a, b, c o d'});
if(Date.now()>d.trivia.tiempo){const rc=d.trivia.correcta;delete d.trivia;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⏰ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n⏰ ¡Se acabó el tiempo!\n📌 La respuesta era: '+rc});return;}
if(resp===d.trivia.correcta){delete d.trivia;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ ¡Correcto!\n✨ +20 XP'});await addXp20();return;}
delete d.trivia;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ❌ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Incorrecto\n📌 La respuesta era: '+d.trivia.correcta});return;
}

// WORDLE
if(cmd===PREFIX+'wordle'||cmd===PREFIX+'wordlepalabra'){
if(cmd===PREFIX+'wordle'){
if(args[1]==='rendirse'&&d.wordle){const p=d.wordle.palabra;delete d.wordle;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n😢 Te rendiste\n📌 La palabra era: '+p});return;}
if(d.wordle)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n🟩 Ya hay un wordle activo\n💡 /wordlepalabra (palabra)\n🏳️ /wordle rendirse'});
const palabras=['perro','gatos','casas','silla','mesas','raton','tecla','piano','playa','monta','campo','flora','nubes','soles','lunas','verde','rojas','aguas','fuego','tigre','libro','hojas','reloj','ancla','bruja','dados','fruta','huevo','queso','reyes'];
const p=palabras[Math.floor(Math.random()*palabras.length)];
d.wordle={palabra:p,intentos:0,maxIntentos:5,activo:true};setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n🔤 Palabra de 5 letras\n🎯 5 intentos\n💡 /wordlepalabra (palabra)\n🏳️ /wordle rendirse'});return;
}
if(cmd===PREFIX+'wordlepalabra'&&d.wordle&&d.wordle.activo){
d.wordle.intentos++;const intento=args[1]?.toLowerCase();
if(!intento||intento.length!==5)return await sock.sendMessage(grupo,{text:'🟩 /wordlepalabra (palabra de 5 letras)'});
const palabra=d.wordle.palabra;let resultado='';
for(let i=0;i<5;i++){if(intento[i]===palabra[i])resultado+='🟩';else if(palabra.includes(intento[i]))resultado+='🟨';else resultado+='⬛';}
if(intento===palabra){delete d.wordle;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n'+resultado+'\n\n✅ ¡Correcto!\n📌 '+palabra+'\n✨ +20 XP'});await addXp20();return;}
if(d.wordle.intentos>=d.wordle.maxIntentos){const p3=d.wordle.palabra;delete d.wordle;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n'+resultado+'\n\n😢 Perdiste\n📌 La palabra era: '+p3});return;}
setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n'+resultado+'\n🎯 Intento '+d.wordle.intentos+'/'+d.wordle.maxIntentos+'\n💡 /wordlepalabra (palabra)'});return;
}
}

// AHORCADO
if(cmd===PREFIX+'ahorcado'){
if(d.ahorcado)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n💀 Ya hay un ahorcado activo\n💡 /ahorcadoletra (letra)\n💡 /ahorcadopalabra (palabra)'});
const palabras=['murcielago','mariposa','elefante','televisor','biblioteca','zanahoria','cocodrilo','hipopotamo','estudiante','guitarra','chocolate','campana','palmera','dinosaurio','helicoptero','microfono','lagartija','primavera','relampago','xilofono','rompecabezas','computadora','astronauta','laberinto','tiburon'];
const p=palabras[Math.floor(Math.random()*palabras.length)];
d.ahorcado={palabra:p,letrasAdivinadas:[],errores:0,maxErrores:6,activo:true};setDB(grupo,d);
let m='';for(const l of p){m+=d.ahorcado.letrasAdivinadas.includes(l)?l+' ':'_ ';}
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n\n🔤 '+p.length+' letras\n💡 /ahorcadoletra (letra)\n💡 /ahorcadopalabra (palabra)'});return;
}
if(cmd===PREFIX+'ahorcadoletra'&&d.ahorcado&&d.ahorcado.activo){
const letra=args[1]?.toLowerCase();if(!letra||letra.length!==1)return await sock.sendMessage(grupo,{text:'💀 /ahorcadoletra (letra)'});
if(d.ahorcado.letrasAdivinadas.includes(letra))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n⚠️ Ya usaste la letra: '+letra});
d.ahorcado.letrasAdivinadas.push(letra);if(!d.ahorcado.palabra.includes(letra))d.ahorcado.errores++;
let m='';for(const l of d.ahorcado.palabra){m+=d.ahorcado.letrasAdivinadas.includes(l)?l+' ':'_ ';}
if(!m.includes('_')){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n\n✅ ¡Ganaste!\n📌 Palabra: '+p2+'\n✨ +20 XP'});await addXp20();return;}
if(d.ahorcado.errores>=d.ahorcado.maxErrores){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n\n😢 Perdiste\n📌 La palabra era: '+p2});return;}
setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n🔤 Letras: '+d.ahorcado.letrasAdivinadas.join(', ')+'\n❌ Errores: '+d.ahorcado.errores+'/'+d.ahorcado.maxErrores});return;
}
if(cmd===PREFIX+'ahorcadopalabra'&&d.ahorcado&&d.ahorcado.activo){
const intento=args.slice(1).join(' ').toLowerCase();if(!intento)return await sock.sendMessage(grupo,{text:'💀 /ahorcadopalabra (palabra)'});
if(intento===d.ahorcado.palabra){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ ¡Correcto!\n📌 Palabra: '+p2+'\n✨ +20 XP'});await addXp20();return;}
d.ahorcado.errores++;if(d.ahorcado.errores>=d.ahorcado.maxErrores){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n😢 Incorrecto\n📌 La palabra era: '+p2});return;}
setDB(grupo,d);let m='';for(const l of d.ahorcado.palabra){m+=d.ahorcado.letrasAdivinadas.includes(l)?l+' ':'_ ';}
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n❌ Incorrecto\n❌ Errores: '+d.ahorcado.errores+'/'+d.ahorcado.maxErrores});return;
}

// RULETA
if(cmd===PREFIX+'ruleta'||cmd===PREFIX+'ruletacrear'||cmd===PREFIX+'ruletaunirse'||cmd===PREFIX+'ruletainiciar'){
if(cmd===PREFIX+'ruleta'){if(!d.ruleta)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔫 *RULETA RUSA*\n╰━━━━━━━━━━━━━━━⬣\n\n💡 /ruletacrear - Crear partida\n💡 /ruletaunirse - Unirse\n💡 /ruletainiciar - Iniciar (dueño)'});if(d.ruleta.activo)return await sock.sendMessage(grupo,{text:'🔫 Ruleta en curso'});}
if(cmd===PREFIX+'ruletacrear'){if(d.ruleta)return await sock.sendMessage(grupo,{text:'🔫 Ya hay una partida'});d.ruleta={jugadores:[sender],dueno:sender,iniciada:false,activo:false};setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔫 *RULETA CREADA*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 Creador: @'+sender.split('@')[0]+'\n👥 Jugadores: 1/5\n💡 /ruletaunirse para unirse\n💡 /ruletainiciar para empezar',mentions:[sender]});return;}
if(cmd===PREFIX+'ruletaunirse'){if(!d.ruleta||d.ruleta.iniciada||d.ruleta.activo)return;if(d.ruleta.jugadores.includes(sender))return await sock.sendMessage(grupo,{text:'🔫 Ya estás en la partida'});if(d.ruleta.jugadores.length>=5)return await sock.sendMessage(grupo,{text:'🔫 Partida llena (5/5)'});d.ruleta.jugadores.push(sender);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔫 *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ @'+sender.split('@')[0]+' se unió\n👥 Jugadores: '+d.ruleta.jugadores.length+'/5',mentions:[sender]});return;}
if(cmd===PREFIX+'ruletainiciar'){if(!d.ruleta||d.ruleta.iniciada||d.ruleta.activo)return;if(d.ruleta.dueno!==sender)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Solo el dueño de la partida puede iniciar'});if(d.ruleta.jugadores.length<2)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Mínimo 2 jugadores'});d.ruleta.iniciada=true;d.ruleta.activo=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔫 *¡RULETA INICIADA!*\n╰━━━━━━━━━━━━━━━⬣\n\n👥 '+d.ruleta.jugadores.length+' jugadores\n🔫 Disparando cada 5 segundos...'});dispararRuleta(sock,grupo,d);return;}
}

// JUEGOS SIMPLES
if(cmd===PREFIX+'8ball'){const p=texto.slice(6);if(!p)return await sock.sendMessage(grupo,{text:'🎱 Haz una pregunta'});const r=['Sí','No','Tal vez','Probablemente','No lo creo','Definitivamente','Pregunta de nuevo','No cuentes con ello','Sin duda','Muy dudoso','Claro que sí','Ni lo sueñes','Puede ser','Yo diría que sí','Rotundamente no'][Math.floor(Math.random()*15)];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎱 *8BALL*\n╰━━━━━━━━━━━━━━━⬣\n\n❓ '+p+'\n🎱 '+r,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'dado'){const r=Math.floor(Math.random()*6)+1;const c=['⚀','⚁','⚂','⚃','⚄','⚅'];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎲 *DADO*\n╰━━━━━━━━━━━━━━━⬣\n\n🎲 '+c[r-1]+' Salió: '+r,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'moneda'){const r=Math.random()<0.5?'Cara':'Cruz';await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🪙 *MONEDA*\n╰━━━━━━━━━━━━━━━⬣\n\n🪙 Salió: '+r+'!',mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'random'){const min=parseInt(args[1]),max=parseInt(args[2]);if(isNaN(min)||isNaN(max))return await sock.sendMessage(grupo,{text:'🎲 Usa: /random 1 100'});const r=Math.floor(Math.random()*(max-min+1))+min;await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎲 *RANDOM*\n╰━━━━━━━━━━━━━━━⬣\n\n🔢 Entre '+min+' y '+max+'\n🎯 Salió: '+r,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'verdadoreto'){const v=['¿Cuál es tu mayor miedo?','¿Qué es lo más vergonzoso que has hecho?','¿A quién admiras más?','¿Cuál es tu secreto mejor guardado?','¿Qué harías con un millón de dólares?','¿Cuál es tu mayor arrepentimiento?','¿Quién te gusta en secreto?','¿Qué sueño tienes pendiente?','¿Cuál es tu peor defecto?','¿Qué canción te da vergüenza?','¿Qué es lo más loco que has hecho por amor?','¿A qué persona del grupo conoces mejor?','¿Cuál es tu mayor logro?','¿Qué cambiarías de tu pasado?','¿Qué superpoder te gustaría tener?'];const rt=['Imita a un famoso','Canta una canción','Baila sin música 10s','Di un trabalenguas','Haz 5 flexiones','Habla con acento diferente','Cuenta un chiste','Haz una mueca y envía foto','Imita a alguien del grupo','Di tu mayor vergüenza','Haz sonido de animal','Ponte algo ridículo y envía foto','Recita un poema inventado','Haz una confesión','Besa tu pantalla'];const ev=Math.random()<0.5;const l=ev?v:rt;const r=l[Math.floor(Math.random()*l.length)];await sock.sendMessage(grupo,{text:(ev?'╭━━━━━━━━━━━━━━━⊷\n┃ ❓ *VERDAD*\n╰━━━━━━━━━━━━━━━⬣\n\n❓ ':'╭━━━━━━━━━━━━━━━⊷\n┃ 🎯 *RETO*\n╰━━━━━━━━━━━━━━━⬣\n\n🎯 ')+r,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'top10'){const tema=texto.slice(6);if(!tema)return await sock.sendMessage(grupo,{text:'🏆 Escribe un tema'});const participantes=metadata.participants.map(p=>p.id);const sel=[];for(let i=0;i<10;i++){sel.push(participantes[Math.floor(Math.random()*participantes.length)]);}let lista='╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *TOP 10 '+tema.toUpperCase()+' 🏆\n╰━━━━━━━━━━━━━━━⬣\n\n';const num=['1','2','3','4','5','6','7','8','9','10'];sel.forEach((u,i)=>lista+=num[i]+': @'+u.split('@')[0]+'\n');await sock.sendMessage(grupo,{text:lista,mentions:sel});await addXpBD();return;}
if(cmd===PREFIX+'autoreact'){const emoji=args[1];if(!emoji||!args[2])return await sock.sendMessage(grupo,{text:'💬 Usa: /autoreact ❤️ on'});if(args[2]==='on'){d.autoreact=emoji;d.autoreactUser=sender.split('@')[0];setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💬 *AUTOREACT*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Reaccionaré con '+emoji+' a tus mensajes\n💡 /autoreact off para desactivar'});}if(args[2]==='off'){d.autoreact='';d.autoreactUser='';setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💬 *AUTOREACT*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Autoreact desactivado'});}await addXpBD();return;}
if(cmd===PREFIX+'gay'){let t=mencionados.length>0?mencionados[0]:sender;const p=Math.floor(Math.random()*150)+1;const e=p>100?'🏳️‍🌈🔥':p>50?'🏳️‍🌈':'👀';await sock.sendMessage(grupo,{image:fs.readFileSync('/storage/emulated/0/Pictures/WhatsApp/IMG-20260508-WA0174.jpg'),caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏳️‍🌈 *GAY*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Eres '+p+'% gay '+e,mentions:[t]}).catch(async()=>{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏳️‍🌈 *GAY*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Eres '+p+'% gay '+e,mentions:[t]});});await addXpBD();return;}
if(cmd===PREFIX+'iq'){let t=mencionados.length>0?mencionados[0]:sender;const p=Math.floor(Math.random()*150)+1;const e=p>130?'🧠🔥':p>90?'🧠':'🤔';await sock.sendMessage(grupo,{image:fs.readFileSync('/storage/emulated/0/Pictures/WhatsApp/IMG-20260508-WA0175.jpg'),caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🧠 *IQ*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Tu IQ es: '+p+' '+e,mentions:[t]}).catch(async()=>{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🧠 *IQ*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Tu IQ es: '+p+' '+e,mentions:[t]});});await addXpBD();return;}
if(cmd===PREFIX+'addbot'){const link=args[1];if(!link)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🤖 *ADDBOT*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Pon un enlace\n📌 /addbot https://chat.whatsapp.com/...'});const miNum=sock.user.id.split(':')[0]+'@s.whatsapp.net';await sock.sendMessage(miNum,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 📩 *NUEVA SOLICITUD*\n╰━━━━━━━━━━━━━━━⬣\n\n🔗 '+link+'\n👤 @'+sender.split('@')[0]+'\n👥 Grupo: '+grupo.split('@')[0],mentions:[sender]});await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *SOLICITUD ENVIADA*\n╰━━━━━━━━━━━━━━━⬣\n\n📩 Solicitud enviada\n⏳ Espera aceptación',mentions:[sender]});await addXpBD();return;}

// PERMISOS - NO TOCAR
if(!isSenderAdmin&&texto.startsWith(PREFIX)&&cmd!==PREFIX+'menu'&&cmd!==PREFIX+'8ball'&&cmd!==PREFIX+'dado'&&cmd!==PREFIX+'moneda'&&cmd!==PREFIX+'random'&&cmd!==PREFIX+'verdadoreto'&&cmd!==PREFIX+'top10'&&cmd!==PREFIX+'autoreact'&&cmd!==PREFIX+'gay'&&cmd!==PREFIX+'iq'&&cmd!==PREFIX+'wordle'&&cmd!==PREFIX+'wordlepalabra'&&cmd!==PREFIX+'ahorcado'&&cmd!==PREFIX+'ahorcadoletra'&&cmd!==PREFIX+'ahorcadopalabra'&&cmd!==PREFIX+'ruleta'&&cmd!==PREFIX+'ruletacrear'&&cmd!==PREFIX+'ruletaunirse'&&cmd!==PREFIX+'ruletainiciar'&&cmd!==PREFIX+'trivia'&&cmd!==PREFIX+'rtrivia'&&cmd!==PREFIX+'spotify'&&cmd!==PREFIX+'play'&&cmd!==PREFIX+'playaudio'&&cmd!==PREFIX+'tt'&&cmd!==PREFIX+'addbot'){
return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *PERMISOS INSUFICIENTES*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 No eres administrador\n🔒 Los comandos de administración, configuración y protección son solo para admins\n\n💡 Pide a un admin que te promueva'});
}
if(!isSenderAdmin)return;

// ADMIN
if(cmd===PREFIX+'welcome'){if(args[1]==='on'){d.welcome=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *BIENVENIDAS*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Bienvenidas activadas\n💡 /welcome off para desactivar'});}if(args[1]==='off'){d.welcome=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *BIENVENIDAS*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Bienvenidas desactivadas\n💡 /welcome on para activar'});}}
if(cmd===PREFIX+'despedida'){if(args[1]==='on'){d.despedida=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👋 *DESPEDIDAS*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Despedidas activadas\n💡 /despedida off para desactivar'});}if(args[1]==='off'){d.despedida=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👋 *DESPEDIDAS*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Despedidas desactivadas\n💡 /despedida on para activar'});}}
if(cmd===PREFIX+'setwelcome'){const msg=texto.slice(12);if(!msg)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✏️ *BIENVENIDA*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Escribe el mensaje\n💡 Usa @user para mencionar al nuevo'});d.welcomeMsg=msg;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *BIENVENIDA*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Mensaje personalizado guardado\n💡 /welcomepredeterminado para restaurar'});}
if(cmd===PREFIX+'setdespedida'){const msg=texto.slice(14);if(!msg)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✏️ *DESPEDIDA*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Escribe el mensaje\n💡 Usa @user para mencionar al que sale'});d.despedidaMsg=msg;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *DESPEDIDA*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Mensaje personalizado guardado\n💡 /despedidapredeterminada para restaurar'});}
if(cmd===PREFIX+'welcomepredeterminado'){d.welcomeMsg='';setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *BIENVENIDA*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Restaurada a predeterminada'});}
if(cmd===PREFIX+'despedidapredeterminada'){d.despedidaMsg='';setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *DESPEDIDA*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Restaurada a predeterminada'});}
if(cmd===PREFIX+'promote'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *PROMOTE*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Este usuario ya es administrador'});await sock.groupParticipantsUpdate(grupo,[t],'promote');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👑 *NUEVO ADMIN*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' ahora es administrador del grupo',mentions:[t]});}
if(cmd===PREFIX+'demote'&&mencionados.length>0){const t=mencionados[0];if(!admins.includes(t))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *DEMOTE*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Este usuario no es administrador'});await sock.groupParticipantsUpdate(grupo,[t],'demote');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👤 *ADMIN RETIRADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' ya no es administrador',mentions:[t]});}
if(cmd===PREFIX+'cerrar'){await sock.groupSettingUpdate(grupo,'announcement');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔒 *GRUPO CERRADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Solo administradores pueden enviar mensajes\n💡 /abrir para abrir el grupo'});}
if(cmd===PREFIX+'abrir'){await sock.groupSettingUpdate(grupo,'not_announcement');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔓 *GRUPO ABIERTO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Todos los miembros pueden enviar mensajes\n💡 /cerrar para cerrar el grupo'});}
if(cmd===PREFIX+'kick'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *EXPULSAR*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ No puedes expulsar a un administrador'});await sock.groupParticipantsUpdate(grupo,[t],'remove');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *USUARIO EXPULSADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' ha sido eliminado del grupo',mentions:[t]});}
if(cmd===PREFIX+'mute'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *SILENCIAR*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ No puedes silenciar a un administrador'});if(!d.muted.includes(t)){d.muted.push(t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔇 *USUARIO SILENCIADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' ha sido silenciado\n💡 /unmute @tag para desilenciar',mentions:[t]});}}
if(cmd===PREFIX+'unmute'&&mencionados.length>0){const t=mencionados[0];d.muted=d.muted.filter(u=>u!==t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔊 *USUARIO DESILENCIADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' ya puede hablar de nuevo',mentions:[t]});}
if(cmd===PREFIX+'warn'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *ADVERTIR*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ No puedes advertir a un administrador'});d.warns[t]=(d.warns[t]||0)+1;setDB(grupo,d);if(d.warns[t]>=3){try{await sock.groupParticipantsUpdate(grupo,[t],'remove');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *EXPULSIÓN AUTOMÁTICA*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Acumuló 3 warns y fue expulsado',mentions:[t]});}catch(e){}return;}await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *ADVERTENCIA*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Warns: '+d.warns[t]+'/3\n💡 /unwarn @tag para quitar advertencia',mentions:[t]});}
if(cmd===PREFIX+'unwarn'&&mencionados.length>0){const t=mencionados[0];if(d.warns[t]>0){d.warns[t]--;if(d.warns[t]===0)delete d.warns[t];setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *WARN RETIRADA*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Warns actuales: '+(d.warns[t]||0),mentions:[t]});}else await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *WARN*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Este usuario no tiene advertencias'});}
if(cmd===PREFIX+'warnlist'){let l='╭━━━━━━━━━━━━━━━⊷\n┃ 📋 *LISTA DE WARNS*\n╰━━━━━━━━━━━━━━━⬣\n\n';const w=Object.entries(d.warns);if(w.length===0)l+='✅ No hay advertencias en el grupo';else w.forEach(([u,c],i)=>l+=(i+1)+'. '+mencion(u)+' - ⚠️ '+c+' warns\n');await sock.sendMessage(grupo,{text:l});}
if(cmd===PREFIX+'hide'){const q=mensaje.message.extendedTextMessage?.contextInfo?.stanzaId;const qs2=mensaje.message.extendedTextMessage?.contextInfo?.participant;if(q&&!admins.includes(qs2))await sock.sendMessage(grupo,{delete:{remoteJid:grupo,fromMe:false,id:q,participant:qs2}});}
if(cmd===PREFIX+'modoadmins'){if(args[1]==='on'){d.modoadmins=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👑 *MODO ADMIN*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Solo administradores pueden usar el bot\n💡 /modoadmins off para desactivar'});}if(args[1]==='off'){d.modoadmins=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👥 *MODO LIBRE*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Todos los miembros pueden usar el bot\n💡 /modoadmins on para restringir'});}}
if(cmd===PREFIX+'banbot'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *BANEAR*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ No puedes banear a un administrador'});if(!d.banbot.includes(t)){d.banbot.push(t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *USUARIO BANEADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' ya no puede usar el bot\n💡 /banbot @tag para desbanear',mentions:[t]});}else{d.banbot=d.banbot.filter(u=>u!==t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *USUARIO DESBANEADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' puede usar el bot de nuevo',mentions:[t]});}}

// PROTECCIÓN
const prot={antispam:'🛡️',antilinks:'🔗',antistickers:'📸',antiimg:'🖼️',antivideos:'🎬',antiaudios:'🎵'};
for(const[k,ico]of Object.entries(prot)){if(cmd===PREFIX+k){if(args[1]==='on'){d[k]=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ '+ico+' *'+k.toUpperCase()+'*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Protección activada\n💡 /'+k+' off para desactivar'});}if(args[1]==='off'){d[k]=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ '+ico+' *'+k.toUpperCase()+'*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Protección desactivada\n💡 /'+k+' on para activar'});}}}
});
}

async function dispararRuleta(sock,grupo,d){
if(!d.ruleta||!d.ruleta.activo)return;
if(d.ruleta.jugadores.length<=1){
const ganador=d.ruleta.jugadores[0];
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n🏆 @'+ganador.split('@')[0]+' GANÓ LA PARTIDA\n✨ +30 XP',mentions:[ganador]});
const uid=ganador.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+30;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nuevo nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[ganador]});}
delete d.ruleta;setDB(grupo,d);return;
}
const idx=Math.floor(Math.random()*d.ruleta.jugadores.length);
const eliminado=d.ruleta.jugadores[idx];
d.ruleta.jugadores.splice(idx,1);setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n💀 @'+eliminado.split('@')[0]+' ha sido eliminado\n👥 Quedan: '+d.ruleta.jugadores.length+' jugadores',mentions:[eliminado]});
setTimeout(()=>dispararRuleta(sock,grupo,d),5000);
}

iniciarBot().catch(err=>console.log('Error:',err));

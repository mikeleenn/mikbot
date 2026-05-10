const axios = require('axios');
const fetch = require('node-fetch');
const yts = require('yt-search');
const fs = require('fs');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { LocalStorage } = require('node-localstorage');
const db = new LocalStorage('./database');
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
const d=getDB(g,{warns:{},muted:[],modoadmins:false,banbot:[],antispam:false,antilinks:false,antistickers:false,antiimg:false,antivideos:false,antiaudios:false,welcome:false,despedida:false,welcomeMsg:'',despedidaMsg:'',autoreact:'',autoreactUser:'',xp:{},nivel:{},wordle:null,ahorcado:null,ruleta:null,trivia:null});
if(u.action==='add'&&d.welcome){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];const msg=d.welcomeMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *BIENVENIDO/A*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n✅ Bienvenido al grupo\n📌 Respeta las reglas';await sock.sendMessage(g,{image:{url:'/storage/emulated/0/Pictures/1778104477459.png'},caption:msg,mentions:[jid]}).catch(async()=>{await sock.sendMessage(g,{text:msg,mentions:[jid]});});}}
if(u.action==='remove'&&d.despedida){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];const msg=d.despedidaMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 👋 *ADIÓS*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n😢 Salió del grupo';await sock.sendMessage(g,{image:{url:'/storage/emulated/0/Pictures/1778101076566.png'},caption:msg,mentions:[jid]}).catch(async()=>{await sock.sendMessage(g,{text:msg,mentions:[jid]});});}}
});

const spamTracker={};
sock.ev.on('messages.upsert',async(m)=>{
const mensaje=m.messages[0];
if(!mensaje.message)return;
const grupo=mensaje.key.remoteJid;
const sender=mensaje.key.participant||mensaje.key.remoteJid;
const d=getDB(grupo,{warns:{},muted:[],modoadmins:false,banbot:[],antispam:false,antilinks:false,antistickers:false,antiimg:false,antivideos:false,antiaudios:false,welcome:false,despedida:false,welcomeMsg:'',despedidaMsg:'',autoreact:'',autoreactUser:'',xp:{},nivel:{},wordle:null,ahorcado:null,ruleta:null,trivia:null});
const ahora=Date.now();
const texto=mensaje.message.conversation||mensaje.message.extendedTextMessage?.text||'';

if(d.autoreact&&(d.autoreactUser===sender||d.autoreactUser===sender.split('@')[0])){try{await sock.sendMessage(grupo,{react:{text:d.autoreact,key:mensaje.key}});}catch(e){}}
if(d.muted.includes(sender)&&!mensaje.key.fromMe){await sock.sendMessage(grupo,{delete:mensaje.key});return;}
let metadata={participants:[]};try{metadata=await getMetadata(sock,grupo);}catch(e){}
const admins=metadata.participants.filter(p=>p.admin).map(p=>p.id);
const isSenderAdmin=admins.includes(sender);
if(!texto)return;
function addWarn(t){d.warns[t]=(d.warns[t]||0)+1;setDB(grupo,d);return d.warns[t];}
async function checkExpulsar(t){if(d.warns[t]>=3){try{await sock.groupParticipantsUpdate(grupo,[t],'remove');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *EXPULSIÓN*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+t.split('@')[0]+'\n📊 Acumuló 3 warns',mentions:[t]});}catch(e){}return true;}return false;}

if(d.antispam&&!isSenderAdmin&&!mensaje.key.fromMe){if(!spamTracker[sender])spamTracker[sender]=[];spamTracker[sender]=spamTracker[sender].filter(t=>ahora-t<10000);spamTracker[sender].push(ahora);if(spamTracker[sender].length>=4){spamTracker[sender]=[];const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTISPAM*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}}
if(d.antilinks&&!isSenderAdmin&&!mensaje.key.fromMe&&/https?:\/\/[^\s]+/i.test(texto)){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTILINKS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antistickers&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.stickerMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTISTICKERS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antiimg&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.imageMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIIMG*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antivideos&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.videoMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIVIDEOS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antiaudios&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.audioMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIAUDIOS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}

if(d.banbot.includes(sender)&&texto.startsWith(PREFIX))return;
let mencionados=mensaje.message.extendedTextMessage?.contextInfo?.mentionedJid||[];
const qs=mensaje.message.extendedTextMessage?.contextInfo?.participant;
if(mencionados.length===0&&qs)mencionados=[qs];
function mencion(uid){return'@'+uid.split('@')[0];}

const args=texto.split(' ');
const cmd=args[0].toLowerCase();
const totalComandos=45;

async function addXpBD(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+10;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp20(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+20;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp30(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+30;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}

if(texto===PREFIX+'menu'){
const num=sender.split('@')[0];
const nivelUsuario=(d.nivel&&d.nivel[num])||1;
const xpUsuario=(d.xp&&d.xp[num])||0;
const xpNecesario=nivelUsuario*100;
const menu="╭━━〔 👑 𝑴𝑰𝑲𝑩𝑶𝑻 👑 〕━━⊷
┃ 👤 Usuario: @"+num+"
┃ 🤖 Versión: Beta
┃ 🧠 Comandos: "+totalComandos+"
┃ 🏆 Nivel: "+nivelUsuario+"
┃ ✨ XP: "+xpUsuario+"/"+xpNecesario+"
╰━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 ⚙️ CONFIGURACIÓN 〕━━⊷
┃ ⚙️ /welcome on/off
┃ `Activa/desactiva bienvenidas`
┃ ⚙️ /despedida on/off
┃ `Activa/desactiva despedidas`
┃ ⚙️ /setwelcome (mensaje)
┃ `Personaliza la bienvenida`
┃ ⚙️ /setdespedida (mensaje)
┃ `Personaliza la despedida`
┃ ⚙️ /welcomepredeterminado
┃ `Restaura bienvenida por defecto`
┃ ⚙️ /despedidapredeterminada
┃ `Restaura despedida por defecto`
╰━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 👑 ADMINISTRACIÓN 〕━━⊷
┃ 👑 /promote @tag
┃ `Da admin al usuario`
┃ 👑 /demote @tag
┃ `Quita admin al usuario`
┃ 👑 /cerrar
┃ `Cierra el grupo`
┃ 👑 /abrir
┃ `Abre el grupo`
┃ 👑 /kick @tag
┃ `Expulsa al usuario`
┃ 👑 /mute @tag
┃ `Silencia al usuario`
┃ 👑 /unmute @tag
┃ `Desilencia al usuario`
┃ 👑 /warn @tag
┃ `Advierte al usuario`
┃ 👑 /unwarn @tag
┃ `Quita advertencia`
┃ 👑 /warnlist
┃ `Lista de advertencias`
┃ 👑 /hide
┃ `Elimina mensaje respondido`
┃ 👑 /modoadmins on/off
┃ `Solo admins usan el bot`
┃ 👑 /banbot @tag
┃ `Banea del bot`
╰━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🛡️ PROTECCIÓN 〕━━⊷
┃ 🛡 /antispam on/off
┃ `4 msg en 10s = warn`
┃ 🛡 /antilinks on/off
┃ `Warn por links`
┃ 🛡 /antistickers on/off
┃ `Warn por stickers`
┃ 🛡 /antiimg on/off
┃ `Warn por imágenes`
┃ 🛡 /antivideos on/off
┃ `Warn por videos`
┃ 🛡 /antiaudios on/off
┃ `Warn por audios`
╰━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🎮 JUEGOS Y DIVERSIÓN 〕━━⊷
┃ 🎮 /8ball (pregunta)
┃ `La bola mágica`
┃ 🎮 /dado
┃ `Lanza un dado`
┃ 🎮 /moneda
┃ `Cara o cruz`
┃ 🎮 /random (min) (max)
┃ `Número aleatorio`
┃ 🎮 /verdadoreto
┃ `Verdad o reto`
┃ 🎮 /top10 (tema)
┃ `Top 10 aleatorio`
┃ 🎮 /autoreact (emoji) on/off
┃ `Reacciona a tus msgs`
┃ 🎮 /gay @tag
┃ `% de qué tan gay eres`
┃ 🎮 /iq @tag
┃ `% de tu IQ`
┃ 🎮 /wordle
┃ `Adivina la palabra`
┃ 🎮 /ahorcado
┃ `Juego del ahorcado`
┃ 🎮 /ruleta
┃ `Ruleta rusa`
┃ 🎮 /trivia
┃ `Preguntas de trivia`
╰━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 📥 DESCARGAS 〕━━⊷
┃ 📥 /spotify (texto)
┃ `Envía audio de Spotify`
┃ 📥 /play (texto)
┃ `Envía video de YouTube`
┃ 📥 /playaudio (texto)
┃ `Envía audio de YouTube`
╰━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 📸 STICKERS 〕━━⊷
┃ 📸 /nuevos comandos próximamente
╰━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🎬 ACCIONES 〕━━⊷
┃ 🎬 /nuevos comandos próximamente
╰━━━━━━━━━━━━━━━━━━━⬣

By: Mikbot | By: mikelennn | By: 2941160601";
onst axios = require('axios');
const fetch = require('node-fetch');
const yts = require('yt-search');
const fs = require('fs');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { LocalStorage } = require('node-localstorage');
const db = new LocalStorage('./database');
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
const d=getDB(g,{warns:{},muted:[],modoadmins:false,banbot:[],antispam:false,antilinks:false,antistickers:false,antiimg:false,antivideos:false,antiaudios:false,welcome:false,despedida:false,welcomeMsg:'',despedidaMsg:'',autoreact:'',autoreactUser:'',xp:{},nivel:{},wordle:null,ahorcado:null,ruleta:null,trivia:null});
if(u.action==='add'&&d.welcome){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];const msg=d.welcomeMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *BIENVENIDO/A*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n✅ Bienvenido al grupo\n📌 Respeta las reglas';await sock.sendMessage(g,{image:{url:'/storage/emulated/0/Pictures/1778104477459.png'},caption:msg,mentions:[jid]}).catch(async()=>{await sock.sendMessage(g,{text:msg,mentions:[jid]});});}}
if(u.action==='remove'&&d.despedida){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];const msg=d.despedidaMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 👋 *ADIÓS*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n😢 Salió del grupo';await sock.sendMessage(g,{image:{url:'/storage/emulated/0/Pictures/1778101076566.png'},caption:msg,mentions:[jid]}).catch(async()=>{await sock.sendMessage(g,{text:msg,mentions:[jid]});});}}
});

const spamTracker={};
sock.ev.on('messages.upsert',async(m)=>{
const mensaje=m.messages[0];
if(!mensaje.message)return;
const grupo=mensaje.key.remoteJid;
const sender=mensaje.key.participant||mensaje.key.remoteJid;
const d=getDB(grupo,{warns:{},muted:[],modoadmins:false,banbot:[],antispam:false,antilinks:false,antistickers:false,antiimg:false,antivideos:false,antiaudios:false,welcome:false,despedida:false,welcomeMsg:'',despedidaMsg:'',autoreact:'',autoreactUser:'',xp:{},nivel:{},wordle:null,ahorcado:null,ruleta:null,trivia:null});
const ahora=Date.now();
const texto=mensaje.message.conversation||mensaje.message.extendedTextMessage?.text||'';

if(d.autoreact&&(d.autoreactUser===sender||d.autoreactUser===sender.split('@')[0])){try{await sock.sendMessage(grupo,{react:{text:d.autoreact,key:mensaje.key}});}catch(e){}}
if(d.muted.includes(sender)&&!mensaje.key.fromMe){await sock.sendMessage(grupo,{delete:mensaje.key});return;}
let metadata={participants:[]};try{metadata=await getMetadata(sock,grupo);}catch(e){}
const admins=metadata.participants.filter(p=>p.admin).map(p=>p.id);
const isSenderAdmin=admins.includes(sender);
if(!texto)return;
function addWarn(t){d.warns[t]=(d.warns[t]||0)+1;setDB(grupo,d);return d.warns[t];}
async function checkExpulsar(t){if(d.warns[t]>=3){try{await sock.groupParticipantsUpdate(grupo,[t],'remove');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *EXPULSIÓN*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+t.split('@')[0]+'\n📊 Acumuló 3 warns',mentions:[t]});}catch(e){}return true;}return false;}

if(d.antispam&&!isSenderAdmin&&!mensaje.key.fromMe){if(!spamTracker[sender])spamTracker[sender]=[];spamTracker[sender]=spamTracker[sender].filter(t=>ahora-t<10000);spamTracker[sender].push(ahora);if(spamTracker[sender].length>=4){spamTracker[sender]=[];const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTISPAM*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}}
if(d.antilinks&&!isSenderAdmin&&!mensaje.key.fromMe&&/https?:\/\/[^\s]+/i.test(texto)){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTILINKS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antistickers&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.stickerMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTISTICKERS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antiimg&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.imageMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIIMG*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antivideos&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.videoMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIVIDEOS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antiaudios&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.audioMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIAUDIOS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n,mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}

if(d.banbot.includes(sender)&&texto.startsWith(PREFIX))return;
let mencionados=mensaje.message.extendedTextMessage?.contextInfo?.mentionedJid||[];
const qs=mensaje.message.extendedTextMessage?.contextInfo?.participant;
if(mencionados.length===0&&qs)mencionados=[qs];
function mencion(uid){return'@'+uid.split('@')[0];}

const args=texto.split(' ');
const cmd=args[0].toLowerCase();
const totalComandos=45;

async function addXpBD(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+10;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp20(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+20;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp30(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+30;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}

if(texto===PREFIX+'menu'){
const num=sender.split('@')[0];
const nivelUsuario=(d.nivel&&d.nivel[num])||1;
const xpUsuario=(d.xp&&d.xp[num])||0;
const xpNecesario=nivelUsuario*100;
const menu="╭━━〔 👑 𝑴𝑰𝑲𝑩𝑶𝑻 👑 〕━━⊷\n┃ 👤 Usuario: @"+num+"\n┃ 🤖 Versión: Beta\n┃ 🧠 Comandos: "+totalComandos+"\n┃ 🏆 Nivel: "+nivelUsuario+"\n┃ ✨ XP: "+xpUsuario+"/"+xpNecesario+"\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 ⚙️ CONFIGURACIÓN 〕━━⊷\n┃ ⚙️ /welcome on/off\n┃ `Activa/desactiva bienvenidas`\n┃ ⚙️ /despedida on/off\n┃ `Activa/desactiva despedidas`\n┃ ⚙️ /setwelcome (mensaje)\n┃ `Personaliza la bienvenida`\n┃ ⚙️ /setdespedida (mensaje)\n┃ `Personaliza la despedida`\n┃ ⚙️ /welcomepredeterminado\n┃ `Restaura bienvenida por defecto`\n┃ ⚙️ /despedidapredeterminada\n┃ `Restaura despedida por defecto`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 👑 ADMINISTRACIÓN 〕━━⊷\n┃ 👑 /promote @tag\n┃ `Da admin al usuario`\n┃ 👑 /demote @tag\n┃ `Quita admin al usuario`\n┃ 👑 /cerrar\n┃ `Cierra el grupo`\n┃ 👑 /abrir\n┃ `Abre el grupo`\n┃ 👑 /kick @tag\n┃ `Expulsa al usuario`\n┃ 👑 /mute @tag\n┃ `Silencia al usuario`\n┃ 👑 /unmute @tag\n┃ `Desilencia al usuario`\n┃ 👑 /warn @tag\n┃ `Advierte al usuario`\n┃ 👑 /unwarn @tag\n┃ `Quita advertencia`\n┃ 👑 /warnlist\n┃ `Lista de advertencias`\n┃ 👑 /hide\n┃ `Elimina mensaje respondido`\n┃ 👑 /modoadmins on/off\n┃ `Solo admins usan el bot`\n┃ 👑 /banbot @tag\n┃ `Banea del bot`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🛡️ PROTECCIÓN 〕━━⊷\n┃ 🛡 /antispam on/off\n┃ `4 msg en 10s = warn`\n┃ 🛡 /antilinks on/off\n┃ `Warn por links`\n┃ 🛡 /antistickers on/off\n┃ `Warn por stickers`\n┃ 🛡 /antiimg on/off\n┃ `Warn por imágenes`\n┃ 🛡 /antivideos on/off\n┃ `Warn por videos`\n┃ 🛡 /antiaudios on/off\n┃ `Warn por audios`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🎮 JUEGOS Y DIVERSIÓN 〕━━⊷\n┃ 🎮 /8ball (pregunta)\n┃ `La bola mágica`\n┃ 🎮 /dado\n┃ `Lanza un dado`\n┃ 🎮 /moneda\n┃ `Cara o cruz`\n┃ 🎮 /random (min) (max)\n┃ `Número aleatorio`\n┃ 🎮 /verdadoreto\n┃ `Verdad o reto`\n┃ 🎮 /top10 (tema)\n┃ `Top 10 aleatorio`\n┃ 🎮 /autoreact (emoji) on/off\n┃ `Reacciona a tus msgs`\n┃ 🎮 /gay @tag\n┃ `% de qué tan gay eres`\n┃ 🎮 /iq @tag\n┃ `% de tu IQ`\n┃ 🎮 /wordle\n┃ `Adivina la palabra`\n┃ 🎮 /ahorcado\n┃ `Juego del ahorcado`\n┃ 🎮 /ruleta\n┃ `Ruleta rusa`\n┃ 🎮 /trivia\n┃ `Preguntas de trivia`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 📥 DESCARGAS 〕━━⊷\n┃ 📥 /spotify (canción)\n┃ `Envía audio de Spotify`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 📸 STICKERS 〕━━⊷\n┃ 📸 /nuevos comandos próximamente\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🎬 ACCIONES 〕━━⊷\n┃ 🎬 /nuevos comandos próximamente\n╰━━━━━━━━━━━━━━━━━━━⬣\n\nBy: Mikbot | By: mikelennn | By: 2941160601";

await sock.sendMessage(grupo,{image:{url:'/storage/emulated/0/Pictures/1777754412038.png'},caption:menu,mentions:[sender]}).catch(async()=>{await sock.sendMessage(grupo,{text:menu,mentions:[sender]});});
await addXpBD();return;
}

// TRIVIA
if(cmd===PREFIX+'trivia'){
if(d.trivia)return await sock.sendMessage(grupo,{text:'❓ Ya hay una trivia activa. Responde con /rtrivia a/b/c/d'});
const preguntas=[{p:'¿Cuál es la capital de Francia?',a:'Londres',b:'París',c:'Madrid',d:'Roma',r:'b'},{p:'¿Cuántos planetas hay en el sistema solar?',a:'7',b:'9',c:'8',d:'10',r:'c'},{p:'¿Quién pintó la Mona Lisa?',a:'Picasso',b:'Van Gogh',c:'Da Vinci',d:'Dalí',r:'c'},{p:'¿Cuál es el océano más grande?',a:'Atlántico',b:'Índico',c:'Ártico',d:'Pacífico',r:'d'},{p:'¿Qué año llegó el hombre a la luna?',a:'1965',b:'1969',c:'1971',d:'1975',r:'b'},{p:'¿Cuál es el animal más rápido?',a:'León',b:'Guepardo',c:'Águila',d:'Tiburón',r:'b'},{p:'¿Cuántos huesos tiene el cuerpo humano?',a:'186',b:'196',c:'206',d:'216',r:'c'},{p:'¿Cuál es el país más grande del mundo?',a:'China',b:'EEUU',c:'Canadá',d:'Rusia',r:'d'},{p:'¿Quién escribió Romeo y Julieta?',a:'Cervantes',b:'Shakespeare',c:'Dante',d:'Homero',r:'b'},{p:'¿Cuál es el elemento químico del agua?',a:'O2',b:'CO2',c:'H2O',d:'NaCl',r:'c'},{p:'¿Cuántos lados tiene un hexágono?',a:'5',b:'6',c:'7',d:'8',r:'b'},{p:'¿Qué país tiene forma de bota?',a:'España',b:'Francia',c:'Italia',d:'Grecia',r:'c'},{p:'¿Cuál es la moneda de Japón?',a:'Yuan',b:'Won',c:'Yen',d:'Dólar',r:'c'},{p:'¿Qué animal simboliza la paz?',a:'Águila',b:'Paloma',c:'León',d:'Lobo',r:'b'},{p:'¿Cuántos colores tiene el arcoíris?',a:'5',b:'6',c:'7',d:'8',r:'c'},{p:'¿Cuál es la montaña más alta?',a:'K2',b:'Everest',c:'Kilimanjaro',d:'Aconcagua',r:'b'},{p:'¿Qué planeta es el más cercano al sol?',a:'Venus',b:'Tierra',c:'Mercurio',d:'Marte',r:'c'},{p:'¿Quién descubrió América?',a:'Magallanes',b:'Colón',c:'Cortés',d:'Pizarro',r:'b'},{p:'¿Cuál es el río más largo del mundo?',a:'Nilo',b:'Amazonas',c:'Yangtsé',d:'Misisipi',r:'b'},{p:'¿Cuántos minutos tiene una hora?',a:'30',b:'45',c:'60',d:'90',r:'c'},{p:'¿Qué idioma se habla en Brasil?',a:'Español',b:'Inglés',c:'Portugués',d:'Francés',r:'c'},{p:'¿Cuál es el metal más caro?',a:'Oro',b:'Plata',c:'Rodio',d:'Platino',r:'c'}];
const pr=preguntas[Math.floor(Math.random()*preguntas.length)];
d.trivia={correcta:pr.r,tiempo:Date.now()+30000,activo:true};
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ❓ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n📝 '+pr.p+'\n\n🅰️ '+pr.a+'\n🅱️ '+pr.b+'\n©️ '+pr.c+'\n🅳️ '+pr.d+'\n\n⏰ 30 segundos\n💡 Responde: /rtrivia a/b/c/d'});
return;
}
if(cmd===PREFIX+'rtrivia'&&d.trivia&&d.trivia.activo){
const resp=args[1]?.toLowerCase();
if(!resp||!['a','b','c','d'].includes(resp))return await sock.sendMessage(grupo,{text:'❓ Responde: /rtrivia a, b, c o d'});
if(Date.now()>d.trivia.tiempo){const rc=d.trivia.correcta;delete d.trivia;setDB(grupo,d);await sock.sendMessage(grupo,{text:'⏰ ¡Se acabó el tiempo! La respuesta era: '+rc});return;}
if(resp===d.trivia.correcta){delete d.trivia;setDB(grupo,d);await sock.sendMessage(grupo,{text:'✅ ¡Correcto! +20 XP',mentions:[sender]});await addXp20();return;}
delete d.trivia;setDB(grupo,d);
await sock.sendMessage(grupo,{text:'❌ Incorrecto. La respuesta era: '+d.trivia.correcta});
return;
}

// RULETA
if(cmd===PREFIX+'ruleta'||cmd===PREFIX+'ruletacrear'||cmd===PREFIX+'ruletaunirse'||cmd===PREFIX+'ruletainiciar'){
if(cmd===PREFIX+'ruleta'){
if(!d.ruleta)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔫 *RULETA RUSA*\n╰━━━━━━━━━━━━━━━⬣\n\n💡 /ruletacrear - Crear partida\n💡 /ruletaunirse - Unirse\n💡 /ruletainiciar - Iniciar (dueño)'});
if(d.ruleta.activo)return await sock.sendMessage(grupo,{text:'🔫 Ruleta en curso...'});
}
if(cmd===PREFIX+'ruletacrear'){
if(d.ruleta)return await sock.sendMessage(grupo,{text:'🔫 Ya hay partida. Usa /ruletaunirse'});
d.ruleta={jugadores:[sender],dueno:sender,iniciada:false,activo:false};
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔫 *RULETA CREADA*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+sender.split('@')[0]+'\n👥 1/5\n💡 /ruletaunirse\n💡 /ruletainiciar',mentions:[sender]});
return;
}
if(cmd===PREFIX+'ruletaunirse'){
if(!d.ruleta||d.ruleta.iniciada||d.ruleta.activo)return;
if(d.ruleta.jugadores.includes(sender))return await sock.sendMessage(grupo,{text:'🔫 Ya estás en la partida'});
if(d.ruleta.jugadores.length>=5)return await sock.sendMessage(grupo,{text:'🔫 Partida llena (5/5)'});
d.ruleta.jugadores.push(sender);setDB(grupo,d);
await sock.sendMessage(grupo,{text:'✅ @'+sender.split('@')[0]+' se unió. '+d.ruleta.jugadores.length+'/5',mentions:[sender]});
return;
}
if(cmd===PREFIX+'ruletainiciar'){
if(!d.ruleta||d.ruleta.iniciada||d.ruleta.activo)return;
if(d.ruleta.dueno!==sender)return await sock.sendMessage(grupo,{text:'❌ Solo el dueño puede iniciar'});
if(d.ruleta.jugadores.length<2)return await sock.sendMessage(grupo,{text:'❌ Mínimo 2 jugadores'});
d.ruleta.iniciada=true;d.ruleta.activo=true;d.ruleta.turno=0;
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔫 *¡RULETA INICIADA!*\n╰━━━━━━━━━━━━━━━⬣\n\n👥 Jugadores: '+d.ruleta.jugadores.length});
dispararRuleta(sock,grupo,d);
return;
}
}

// WORDLE
if(cmd===PREFIX+'wordle'||cmd===PREFIX+'wordlepalabra'){
if(cmd===PREFIX+'wordle'){
if(args[1]==='rendirse'&&d.wordle){const p2=d.wordle.palabra;delete d.wordle;setDB(grupo,d);await sock.sendMessage(grupo,{text:'😢 Te rendiste. Era: '+p2});return;}
if(d.wordle)return await sock.sendMessage(grupo,{text:'🟩 Ya hay wordle. Usa /wordlepalabra (palabra) o /wordle rendirse'});
const palabras=['perro','gatos','casas','silla','mesas','raton','tecla','piano','playa','monta','campo','flora','nubes','soles','lunas','verde','rojas','aguas','fuego','tigre','libro','hojas','reloj','ancla','bruja','dados','fruta','huevo','queso','reyes'];
const p=palabras[Math.floor(Math.random()*palabras.length)];
d.wordle={palabra:p,intentos:0,maxIntentos:5,activo:true};
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n🔤 5 letras\n🎯 5 intentos\n💡 /wordlepalabra (palabra)\n🏳️ /wordle rendirse'});
return;
}
if(cmd===PREFIX+'wordlepalabra'&&d.wordle&&d.wordle.activo){
d.wordle.intentos++;
const intento=args[1]?.toLowerCase();
if(!intento||intento.length!==5)return await sock.sendMessage(grupo,{text:'🟩 /wordlepalabra (palabra de 5 letras)'});
const palabra=d.wordle.palabra;
let resultado='';
for(let i=0;i<5;i++){if(intento[i]===palabra[i])resultado+='🟩';else if(palabra.includes(intento[i]))resultado+='🟨';else resultado+='⬛';}
if(intento===palabra){delete d.wordle;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n'+resultado+'\n\n✅ ¡Correcto! Era: '+palabra+'\n✨ +20 XP'});await addXp20();return;}
if(d.wordle.intentos>=d.wordle.maxIntentos){const p3=d.wordle.palabra;delete d.wordle;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n'+resultado+'\n\n😢 Perdiste. Era: '+p3});return;}
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n'+resultado+'\n🎯 Intento '+d.wordle.intentos+'/'+d.wordle.maxIntentos+'\n💡 /wordlepalabra (palabra)'});
return;
}
}

// AHORCADO
if(cmd===PREFIX+'ahorcado'){
if(d.ahorcado)return await sock.sendMessage(grupo,{text:'💀 Ya hay ahorcado. /ahorcadopalabra o /ahorcadoletra'});
const palabras=['murcielago','mariposa','elefante','televisor','biblioteca','zanahoria','cocodrilo','hipopotamo','estudiante','guitarra','chocolate','campana','palmera','dinosaurio','helicoptero','microfono','lagartija','primavera','relampago','xilofono','rompecabezas','computadora','astronauta','laberinto','tiburon'];
const p=palabras[Math.floor(Math.random()*palabras.length)];
d.ahorcado={palabra:p,letrasAdivinadas:[],errores:0,maxErrores:6,activo:true};
setDB(grupo,d);
let m='';for(const l of p){m+=d.ahorcado.letrasAdivinadas.includes(l)?l+' ':'_ ';}
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n\n💡 /ahorcadoletra (letra)\n💡 /ahorcadopalabra (palabra)'});
return;
}
if(cmd===PREFIX+'ahorcadoletra'&&d.ahorcado&&d.ahorcado.activo){
const letra=args[1]?.toLowerCase();
if(!letra||letra.length!==1)return await sock.sendMessage(grupo,{text:'💀 /ahorcadoletra (letra)'});
if(d.ahorcado.letrasAdivinadas.includes(letra))return await sock.sendMessage(grupo,{text:'⚠️ Ya usaste esa letra'});
d.ahorcado.letrasAdivinadas.push(letra);
if(!d.ahorcado.palabra.includes(letra))d.ahorcado.errores++;
let m='';for(const l of d.ahorcado.palabra){m+=d.ahorcado.letrasAdivinadas.includes(l)?l+' ':'_ ';}
const ganar=!m.includes('_');
const perder=d.ahorcado.errores>=d.ahorcado.maxErrores;
if(ganar){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n\n✅ ¡Ganaste! Palabra: '+p2+'\n✨ +20 XP'});await addXp20();return;}
if(perder){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n\n😢 Perdiste. Era: '+p2});return;}
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n🔤 Letras: '+d.ahorcado.letrasAdivinadas.join(', ')+'\n❌ Errores: '+d.ahorcado.errores+'/'+d.ahorcado.maxErrores});return;
}
if(cmd===PREFIX+'ahorcadopalabra'&&d.ahorcado&&d.ahorcado.activo){
const intento=args.slice(1).join(' ').toLowerCase();
if(!intento)return await sock.sendMessage(grupo,{text:'💀 /ahorcadopalabra (palabra)'});
if(intento===d.ahorcado.palabra){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ ¡Correcto! Palabra: '+p2+'\n✨ +20 XP'});await addXp20();return;}
d.ahorcado.errores++;
if(d.ahorcado.errores>=d.ahorcado.maxErrores){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n😢 Incorrecto. Era: '+p2});return;}
setDB(grupo,d);
let m='';for(const l of d.ahorcado.palabra){m+=d.ahorcado.letrasAdivinadas.includes(l)?l+' ':'_ ';}
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n❌ Incorrecto. Errores: '+d.ahorcado.errores+'/'+d.ahorcado.maxErrores});return;
}

// JUEGOS SIMPLES
if(cmd===PREFIX+'8ball'){const p=texto.slice(6);if(!p)return await sock.sendMessage(grupo,{text:'🎱 Haz una pregunta'});const r=['Sí','No','Tal vez','Probablemente','No lo creo','Definitivamente','Pregunta de nuevo','No cuentes con ello','Sin duda','Muy dudoso','Claro que sí','Ni lo sueñes','Puede ser','Yo diría que sí','Rotundamente no'][Math.floor(Math.random()*15)];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎱 *8BALL*\n╰━━━━━━━━━━━━━━━⬣\n\n❓ '+p+'\n🎱 '+r,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'dado'){const r=Math.floor(Math.random()*6)+1;const c=['⚀','⚁','⚂','⚃','⚄','⚅'];await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎲 *DADO*\n╰━━━━━━━━━━━━━━━⬣\n\n🎲 '+c[r-1]+' Salió: '+r,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'moneda'){const r=Math.random()<0.5?'Cara':'Cruz';await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🪙 *MONEDA*\n╰━━━━━━━━━━━━━━━⬣\n\n🪙 Salió: '+r+'!',mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'random'){const min=parseInt(args[1]),max=parseInt(args[2]);if(isNaN(min)||isNaN(max))return await sock.sendMessage(grupo,{text:'🎲 Usa: /random 1 100'});const r=Math.floor(Math.random()*(max-min+1))+min;await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎲 *RANDOM*\n╰━━━━━━━━━━━━━━━⬣\n\n🔢 Entre '+min+' y '+max+'\n🎯 Salió: '+r,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'verdadoreto'){const v=['¿Cuál es tu mayor miedo?','¿Qué es lo más vergonzoso que has hecho?','¿A quién admiras más?','¿Cuál es tu secreto mejor guardado?','¿Qué harías con un millón de dólares?','¿Cuál es tu mayor arrepentimiento?','¿Quién te gusta en secreto?','¿Qué sueño tienes pendiente?','¿Cuál es tu peor defecto?','¿Qué canción te da vergüenza?','¿Qué es lo más loco que has hecho por amor?','¿A qué persona del grupo conoces mejor?','¿Cuál es tu mayor logro?','¿Qué cambiarías de tu pasado?','¿Qué superpoder te gustaría tener?'];const rt=['Imita a un famoso','Canta una canción','Baila sin música 10s','Di un trabalenguas','Haz 5 flexiones','Habla con acento diferente','Cuenta un chiste','Haz una mueca y envía foto','Imita a alguien del grupo','Di tu mayor vergüenza','Haz sonido de animal','Ponte algo ridículo y envía foto','Recita un poema inventado','Haz una confesión','Besa tu pantalla'];const ev=Math.random()<0.5;const l=ev?v:rt;const r=l[Math.floor(Math.random()*l.length)];await sock.sendMessage(grupo,{text:(ev?'╭━━━━━━━━━━━━━━━⊷\n┃ ❓ *VERDAD*\n╰━━━━━━━━━━━━━━━⬣\n\n❓ ':'╭━━━━━━━━━━━━━━━⊷\n┃ 🎯 *RETO*\n╰━━━━━━━━━━━━━━━⬣\n\n🎯 ')+r,mentions:[sender]});await addXpBD();return;}
if(cmd===PREFIX+'top10'){const tema=texto.slice(6);if(!tema)return await sock.sendMessage(grupo,{text:'🏆 Escribe un tema'});const participantes=metadata.participants.filter(p=>!p.admin).map(p=>p.id);const sel=[],disp=[...participantes];for(let i=0;i<Math.min(10,disp.length);i++){const idx=Math.floor(Math.random()*disp.length);sel.push(disp.splice(idx,1)[0]);}let lista='╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *TOP 10*\n╰━━━━━━━━━━━━━━━⬣\n\n📋 '+tema+'\n\n';const med=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];sel.forEach((u,i)=>lista+=med[i]+' @'+u.split('@')[0]+'\n');await sock.sendMessage(grupo,{text:lista,mentions:sel});await addXpBD();return;}
if(cmd===PREFIX+'autoreact'){const emoji=args[1];if(!emoji||!args[2])return await sock.sendMessage(grupo,{text:'💬 Usa: /autoreact ❤️ on'});if(args[2]==='on'){d.autoreact=emoji;d.autoreactUser=sender.split('@')[0];setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💬 *AUTOREACT*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Reaccionaré con '+emoji+'\n💡 /autoreact off'});}if(args[2]==='off'){d.autoreact='';d.autoreactUser='';setDB(grupo,d);await sock.sendMessage(grupo,{text:'💬 Autoreact desactivado'});}await addXpBD();return;}
if(cmd===PREFIX+'gay'){let t=mencionados.length>0?mencionados[0]:sender;const p=Math.floor(Math.random()*150)+1;const e=p>100?'🏳️‍🌈🔥':p>50?'🏳️‍🌈':'👀';await sock.sendMessage(grupo,{image:{url:'/storage/emulated/0/Pictures/WhatsApp/IMG-20260508-WA0174.jpg'},caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏳️‍🌈 *GAY*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Eres '+p+'% gay '+e,mentions:[t]}).catch(async()=>{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏳️‍🌈 *GAY*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Eres '+p+'% gay '+e,mentions:[t]});});await addXpBD();return;}
if(cmd===PREFIX+'iq'){let t=mencionados.length>0?mencionados[0]:sender;const p=Math.floor(Math.random()*150)+1;const e=p>130?'🧠🔥':p>90?'🧠':'🤔';await sock.sendMessage(grupo,{image:{url:'/storage/emulated/0/Pictures/WhatsApp/IMG-20260508-WA0175.jpg'},caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🧠 *IQ*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Tu IQ es: '+p+' '+e,mentions:[t]}).catch(async()=>{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🧠 *IQ*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Tu IQ es: '+p+' '+e,mentions:[t]});});await addXpBD();return;}
if(cmd===PREFIX+'addbot'){const link=args[1];if(!link)return await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🤖 *ADDBOT*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Pon un enlace\n📌 /addbot https://chat.whatsapp.com/...'});const miNum=sock.user.id.split(':')[0]+'@s.whatsapp.net';await sock.sendMessage(miNum,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 📩 *NUEVA SOLICITUD*\n╰━━━━━━━━━━━━━━━⬣\n\n🔗 '+link+'\n👤 @'+sender.split('@')[0]+'\n👥 Grupo: '+grupo.split('@')[0],mentions:[sender]});await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *SOLICITUD ENVIADA*\n╰━━━━━━━━━━━━━━━⬣\n\n📩 Solicitud enviada\n⏳ Espera aceptación',mentions:[sender]});await addXpBD();return;}


// SPOTIFY
if(cmd===PREFIX+'spotify'){
const query=texto.slice(9);
if(!query)return await sock.sendMessage(grupo,{text:'🎵 Usa: /spotify (nombre de canción)'});
await sock.sendMessage(grupo,{text:'🔍 Buscando en Spotify: '+query});
try{
const key='sasuke';
const searchRes=await axios.get('https://api.evogb.org/search/spotify?query='+encodeURIComponent(query)+'&key='+key);
if(!searchRes.data.status||!searchRes.data.result.length)return await sock.sendMessage(grupo,{text:'❌ No se encontraron resultados'});
const track=searchRes.data.result[0];
const trackUrl='https://open.spotify.com/track/'+track.id;
const dlRes=await axios.get('https://api.evogb.org/dl/spotify?url='+encodeURIComponent(trackUrl)+'&key='+key);
if(!dlRes.data.status)return await sock.sendMessage(grupo,{text:'❌ Error al descargar'});
const data=dlRes.data.data;
const info='╭━━━━━━━━━━━━━━━⊷\n┃ 🎵 *SPOTIFY*\n╰━━━━━━━━━━━━━━━⬣\n\n🎵 '+data.name+'\n👤 '+data.artist+'\n💿 '+data.album+'\n⏱️ '+data.duration;
await sock.sendMessage(grupo,{image:{url:data.imageHD||data.image},caption:info});
await sock.sendMessage(grupo,{audio:{url:data.url},mimetype:'audio/mpeg',fileName:data.name+'.mp3'});
}catch(e){
await sock.sendMessage(grupo,{text:'🎵 '+query+'\n❌ La API de Spotify no está disponible ahora. Intenta más tarde.'});
}
return;
}

        // PLAY VIDEO
if(cmd===PREFIX+'play'){
const busqueda=texto.slice(6);
if(!busqueda)return await sock.sendMessage(grupo,{text:'🎬 Usa: /play (nombre del video)'});
await sock.sendMessage(grupo,{text:'🔍 Buscando video: '+busqueda});
try{
let videoUrl=busqueda;
if(!busqueda.match(/youtu/gi)){
const r=await yts(busqueda);
if(!r.all.length)return await sock.sendMessage(grupo,{text:'❌ Sin resultados'});
videoUrl=r.videos[0].url;
}
const apiUrl='https://api.delirius.store/download/ytmp4?url='+encodeURIComponent(videoUrl)+'&format=360p';
const res=await fetch(apiUrl);
const json=await res.json();
if(!json.status||!json.data)return await sock.sendMessage(grupo,{text:'❌ Error al obtener video'});
const {title,author,download} = json.data;
await sock.sendMessage(grupo,{video:{url:download},caption:'🎬 '+title+'\n👤 '+author,mimetype:'video/mp4'});
}catch(e){
await sock.sendMessage(grupo,{text:'❌ Error: '+e.message});
}
return;
}

        // PLAY AUDIO
if(cmd===PREFIX+'playaudio'){
const busqueda=texto.slice(11);
if(!busqueda)return await sock.sendMessage(grupo,{text:'🎵 Usa: /playaudio (nombre de canción)'});
await sock.sendMessage(grupo,{text:'🔍 Buscando: '+busqueda});
try{
let videoUrl=busqueda;
if(!busqueda.match(/youtu/gi)){
const r=await yts(busqueda);
if(!r.all.length)return await sock.sendMessage(grupo,{text:'❌ Sin resultados'});
videoUrl=r.videos[0].url;
}
const apiUrl='https://api.delirius.store/download/ytmp3?url='+encodeURIComponent(videoUrl);
const res=await fetch(apiUrl);
const json=await res.json();
if(!json.status||!json.data)return await sock.sendMessage(grupo,{text:'❌ Error al descargar'});
const {title,author,image,download} = json.data;
await sock.sendMessage(grupo,{image:{url:image},caption:'🎵 '+title+'\n👤 '+author});
await sock.sendMessage(grupo,{audio:{url:download},mimetype:'audio/mpeg',fileName:title+'.mp3'});
}catch(e){
await sock.sendMessage(grupo,{text:'❌ Error: '+e.message});
}
return;
}

if(d.modoadmins&&!isSenderAdmin&&texto.startsWith(PREFIX))return;
if(!isSenderAdmin)return;

// ADMIN
if(cmd===PREFIX+'welcome'){if(args[1]==='on'){d.welcome=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *BIENVENIDAS*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Activadas'});}if(args[1]==='off'){d.welcome=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *BIENVENIDAS*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Desactivadas'});}}
if(cmd===PREFIX+'despedida'){if(args[1]==='on'){d.despedida=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👋 *DESPEDIDAS*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Activadas'});}if(args[1]==='off'){d.despedida=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👋 *DESPEDIDAS*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Desactivadas'});}}
if(cmd===PREFIX+'setwelcome'){const msg=texto.slice(12);if(!msg)return await sock.sendMessage(grupo,{text:'❌ Escribe el mensaje'});d.welcomeMsg=msg;setDB(grupo,d);await sock.sendMessage(grupo,{text:'✅ Bienvenida personalizada'});}
if(cmd===PREFIX+'setdespedida'){const msg=texto.slice(14);if(!msg)return await sock.sendMessage(grupo,{text:'❌ Escribe el mensaje'});d.despedidaMsg=msg;setDB(grupo,d);await sock.sendMessage(grupo,{text:'✅ Despedida personalizada'});}
if(cmd===PREFIX+'welcomepredeterminado'){d.welcomeMsg='';setDB(grupo,d);await sock.sendMessage(grupo,{text:'✅ Restaurada'});}
if(cmd===PREFIX+'despedidapredeterminada'){d.despedidaMsg='';setDB(grupo,d);await sock.sendMessage(grupo,{text:'✅ Restaurada'});}
if(cmd===PREFIX+'promote'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'❌ Ya es admin'});await sock.groupParticipantsUpdate(grupo,[t],'promote');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👑 *NUEVO ADMIN*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' ahora es administrador',mentions:[t]});}
if(cmd===PREFIX+'demote'&&mencionados.length>0){const t=mencionados[0];if(!admins.includes(t))return await sock.sendMessage(grupo,{text:'❌ No es admin'});await sock.groupParticipantsUpdate(grupo,[t],'demote');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👤 *ADMIN RETIRADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' ya no es administrador',mentions:[t]});}
if(cmd===PREFIX+'cerrar'){await sock.groupSettingUpdate(grupo,'announcement');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔒 *GRUPO CERRADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Solo admins envían mensajes'});}
if(cmd===PREFIX+'abrir'){await sock.groupSettingUpdate(grupo,'not_announcement');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔓 *GRUPO ABIERTO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Todos envían mensajes'});}
if(cmd===PREFIX+'kick'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'❌ No puedes echar admin'});await sock.groupParticipantsUpdate(grupo,[t],'remove');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *EXPULSADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' eliminado',mentions:[t]});}
if(cmd===PREFIX+'mute'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'❌ No puedes mutear admin'});if(!d.muted.includes(t)){d.muted.push(t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔇 *SILENCIADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' silenciado',mentions:[t]});}}
if(cmd===PREFIX+'unmute'&&mencionados.length>0){const t=mencionados[0];d.muted=d.muted.filter(u=>u!==t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔊 *DESILENCIADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' ya puede hablar',mentions:[t]});}
if(cmd===PREFIX+'warn'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'❌ No puedes advertir admin'});d.warns[t]=(d.warns[t]||0)+1;setDB(grupo,d);if(d.warns[t]>=3){try{await sock.groupParticipantsUpdate(grupo,[t],'remove');await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *EXPULSIÓN*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Acumuló 3 warns',mentions:[t]});}catch(e){}return;}await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *ADVERTENCIA*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Warns: '+d.warns[t],mentions:[t]});}
if(cmd===PREFIX+'unwarn'&&mencionados.length>0){const t=mencionados[0];if(d.warns[t]>0){d.warns[t]--;if(d.warns[t]===0)delete d.warns[t];setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *WARN RETIRADA*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Warns: '+(d.warns[t]||0),mentions:[t]});}else await sock.sendMessage(grupo,{text:'❌ No tiene warns'});}
if(cmd===PREFIX+'warnlist'){let l='╭━━━━━━━━━━━━━━━⊷\n┃ 📋 *LISTA DE WARNS*\n╰━━━━━━━━━━━━━━━⬣\n\n';const w=Object.entries(d.warns);if(w.length===0)l+='✅ No hay warns';else w.forEach(([u,c],i)=>l+=(i+1)+'. '+mencion(u)+': '+c+'\n');await sock.sendMessage(grupo,{text:l});}
if(cmd===PREFIX+'hide'){const q=mensaje.message.extendedTextMessage?.contextInfo?.stanzaId;const qs2=mensaje.message.extendedTextMessage?.contextInfo?.participant;if(q&&!admins.includes(qs2))await sock.sendMessage(grupo,{delete:{remoteJid:grupo,fromMe:false,id:q,participant:qs2}});}
if(cmd===PREFIX+'modoadmins'){if(args[1]==='on'){d.modoadmins=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👑 *MODO ADMINS*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Solo admins usan el bot'});}if(args[1]==='off'){d.modoadmins=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👥 *MODO LIBRE*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Todos usan el bot'});}}
if(cmd===PREFIX+'banbot'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'❌ No puedes banear admin'});if(!d.banbot.includes(t)){d.banbot.push(t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *BANEADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' no puede usar el bot',mentions:[t]});}else{d.banbot=d.banbot.filter(u=>u!==t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *DESBANEADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' puede usar el bot',mentions:[t]});}}
const prot={antispam:'🛡️',antilinks:'🔗',antistickers:'📸',antiimg:'🖼️',antivideos:'🎬',antiaudios:'🎵'};
for(const[k,ico]of Object.entries(prot)){if(cmd===PREFIX+k){if(args[1]==='on'){d[k]=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ '+ico+' *'+k.toUpperCase()+'*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Activado\n💡 /'+k+' off'});}if(args[1]==='off'){d[k]=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ '+ico+' *'+k.toUpperCase()+'*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Desactivado\n💡 /'+k+' on'});}}}
});
}

async function dispararRuleta(sock,grupo,d){
if(!d.ruleta||!d.ruleta.activo)return;
if(d.ruleta.jugadores.length<=1){
const ganador=d.ruleta.jugadores[0];
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔫 *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n🏆 @'+ganador.split('@')[0]+' GANÓ\n✨ +30 XP',mentions:[ganador]});
const uid=ganador.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+30;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[ganador]});}
delete d.ruleta;setDB(grupo,d);return;
}
const idx=Math.floor(Math.random()*d.ruleta.jugadores.length);
const eliminado=d.ruleta.jugadores[idx];
d.ruleta.jugadores.splice(idx,1);
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🔫 *¡DISPARO!*\n╰━━━━━━━━━━━━━━━⬣\n\n💀 @'+eliminado.split('@')[0]+' eliminado\n👥 Quedan: '+d.ruleta.jugadores.length,mentions:[eliminado]});
setTimeout(()=>dispararRuleta(sock,grupo,d),5000);
}

iniciarBot().catch(err=>console.log('Error:',err));

const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { LocalStorage } = require('node-localstorage');
const db = new LocalStorage('./database');
const axios = require('axios');
const fetch = require('node-fetch');
const yts = require('yt-search');
const fs = require('fs');
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
const d=getDB(g,{warns:{},muted:[],modoadmins:false,banbot:[],antispam:false,antilinks:false,antistickers:false,antiimg:false,antivideos:false,antiaudios:false,welcome:false,despedida:false,welcomeMsg:'',despedidaMsg:'',autoreact:'',autoreactUser:'',xp:{},nivel:{},wordle:null,ahorcado:null,ruleta:null,trivia:null,mikcoins:{},minarCooldown:{},robarCooldown:{},dailyCooldown:{},workCooldown:{},crimeCooldown:{},mikbank:{},deuda:{},deudaTimestamp:{},escudoAntiRobo:{},picoMejorado:{},monedero:{},boostXP:{},loteria:{},inventario:{},begCooldown:{},fishCooldown:{},huntCooldown:{},mochila:{},picoDiamante:{}});
if(u.action==='add'&&d.welcome){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];let msgB=d.welcomeMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *BIENVENIDO/A*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n✅ Bienvenido al grupo\n📌 Respeta las reglas';msgB=msgB.replace(/@user/g,'@'+num);await sock.sendMessage(g,{image:fs.readFileSync('/storage/emulated/0/Pictures/bienvenidabot.png'),caption:msgB,mentions:[jid]}).catch(async()=>{await sock.sendMessage(g,{text:msgB,mentions:[jid]});});}}
if(u.action==='remove'&&d.despedida){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];let msgD=d.despedidaMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 👋 *ADIÓS*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n😢 Salió del grupo';msgD=msgD.replace(/@user/g,'@'+num);await sock.sendMessage(g,{image:fs.readFileSync('/storage/emulated/0/Pictures/1778101076566.png'),caption:msgD,mentions:[jid]}).catch(async()=>{await sock.sendMessage(g,{text:msgD,mentions:[jid]});});}}
});

const spamTracker={};
sock.ev.on('messages.upsert',async(m)=>{
const mensaje=m.messages[0];
if(!mensaje.message)return;
const grupo=mensaje.key.remoteJid;
const sender=mensaje.key.participant||mensaje.key.remoteJid;
const d=getDB(grupo,{warns:{},muted:[],modoadmins:false,banbot:[],antispam:false,antilinks:false,antistickers:false,antiimg:false,antivideos:false,antiaudios:false,welcome:false,despedida:false,welcomeMsg:'',despedidaMsg:'',autoreact:'',autoreactUser:'',xp:{},nivel:{},wordle:null,ahorcado:null,ruleta:null,trivia:null,mikcoins:{},minarCooldown:{},robarCooldown:{},dailyCooldown:{},workCooldown:{},crimeCooldown:{},mikbank:{},deuda:{},deudaTimestamp:{},escudoAntiRobo:{},picoMejorado:{},monedero:{},boostXP:{},loteria:{},inventario:{},begCooldown:{},fishCooldown:{},huntCooldown:{},mochila:{},picoDiamante:{}});
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

if(d.antispam&&!isSenderAdmin&&!mensaje.key.fromMe){if(!spamTracker[sender])spamTracker[sender]=[];spamTracker[sender]=spamTracker[sender].filter(t=>ahora-t<10000);spamTracker[sender].push(ahora);if(spamTracker[sender].length>=4){spamTracker[sender]=[];const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTISPAM*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Muchos mensajes en poco tiempo',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}}
if(d.antilinks&&!isSenderAdmin&&!mensaje.key.fromMe&&/https?:\/\/[^\s]+/i.test(texto)){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTILINKS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Envío de enlaces',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antistickers&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.stickerMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTISTICKERS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Envío de stickers',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antiimg&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.imageMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIIMG*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Envío de imágenes',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antivideos&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.videoMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIVIDEOS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Envío de videos',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}
if(d.antiaudios&&!isSenderAdmin&&!mensaje.key.fromMe&&mensaje.message.audioMessage){const n=addWarn(sender);if(await checkExpulsar(sender))return;await sock.sendMessage(grupo,{text:'▰▰▰▰▰▰▰▰▰▰▰▰▰\n⛔ *ANTIAUDIOS*\n▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n👤 @'+sender.split('@')[0]+'\n📊 Warns: '+n+'\n📝 Envío de audios',mentions:[sender]});try{await sock.sendMessage(grupo,{delete:mensaje.key});}catch(e){}return;}

if(d.banbot.includes(sender)&&texto.startsWith(PREFIX))return;
let mencionados=mensaje.message.extendedTextMessage?.contextInfo?.mentionedJid||[];
const qs=mensaje.message.extendedTextMessage?.contextInfo?.participant;
if(mencionados.length===0&&qs)mencionados=[qs];
function mencion(uid){return'@'+uid.split('@')[0];}

const args=texto.split(' ');
const cmd=args[0].toLowerCase();
const totalComandos=87;

async function addXpBD(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+10;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nuevo nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp20(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+20;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nuevo nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp30(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+30;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nuevo nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}

if(texto===PREFIX+'menu'){
const num=sender.split('@')[0];
const nivelUsuario=(d.nivel&&d.nivel[num])||1;
const xpUsuario=(d.xp&&d.xp[num])||0;
const xpNecesario=nivelUsuario*100;
const mikCoinsUsuario=(d.mikcoins&&d.mikcoins[num])||0;
const menu="╭━━〔 👑 𝑴𝑰𝑲𝑩𝑶𝑻 👑 〕━━⊷\n┃ 👤 Usuario: @"+num+"\n┃ 🤖 Versión: Beta\n┃ 🧠 Comandos: "+totalComandos+"\n┃ 🏆 Nivel: "+nivelUsuario+"\n┃ ✨ XP: "+xpUsuario+"/"+xpNecesario+"\n┃ 💰 MikCoins: "+mikCoinsUsuario+"\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 ⚙️ CONFIGURACIÓN 〕━━⊷\n┃ ⚙️ /welcome on/off\n┃ `Activa/desactiva bienvenidas`\n┃ ⚙️ /despedida on/off\n┃ `Activa/desactiva despedidas`\n┃ ⚙️ /setwelcome (mensaje)\n┃ `Personaliza la bienvenida`\n┃ ⚙️ /setdespedida (mensaje)\n┃ `Personaliza la despedida`\n┃ ⚙️ /welcomepredeterminado\n┃ `Restaura bienvenida por defecto`\n┃ ⚙️ /despedidapredeterminada\n┃ `Restaura despedida por defecto`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 👑 ADMINISTRACIÓN 〕━━⊷\n┃ 👑 /promote @tag\n┃ `Da admin al usuario`\n┃ 👑 /demote @tag\n┃ `Quita admin al usuario`\n┃ 👑 /cerrar\n┃ `Cierra el grupo`\n┃ 👑 /abrir\n┃ `Abre el grupo`\n┃ 👑 /kick @tag\n┃ `Expulsa al usuario`\n┃ 👑 /mute @tag\n┃ `Silencia al usuario`\n┃ 👑 /unmute @tag\n┃ `Desilencia al usuario`\n┃ 👑 /warn @tag\n┃ `Advierte al usuario`\n┃ 👑 /unwarn @tag\n┃ `Quita advertencia`\n┃ 👑 /warnlist\n┃ `Lista de advertencias`\n┃ 👑 /hide\n┃ `Elimina mensaje respondido`\n┃ 👑 /modoadmins on/off\n┃ `Solo admins usan el bot`\n┃ 👑 /banbot @tag\n┃ `Banea del bot`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🛡️ PROTECCIÓN 〕━━⊷\n┃ 🛡 /antispam on/off\n┃ `4 msg en 10s = warn`\n┃ 🛡 /antilinks on/off\n┃ `Warn por links`\n┃ 🛡 /antistickers on/off\n┃ `Warn por stickers`\n┃ 🛡 /antiimg on/off\n┃ `Warn por imágenes`\n┃ 🛡 /antivideos on/off\n┃ `Warn por videos`\n┃ 🛡 /antiaudios on/off\n┃ `Warn por audios`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 💰 ECONOMÍA 〕━━⊷\n┃ 💰 /daily\n┃ `100 MC cada 24h`\n┃ 💰 /minar\n┃ `Gana 10-100 cada 30 min`\n┃ 💰 /work\n┃ `Trabaja cada 1 hora`\n┃ 💰 /crime\n┃ `Crimen cada 2 horas`\n┃ 💰 /mendigar\n┃ `Pide limosna cada 30 min`\n┃ 💰 /pescar\n┃ `Pesca cada 45 min`\n┃ 💰 /cazar\n┃ `Caza cada 1 hora`\n┃ 💰 /banco\n┃ `Ve tu saldo`\n┃ 💰 /depositar (cantidad/all)\n┃ `Guarda en el banco`\n┃ 💰 /sacar (cantidad/all)\n┃ `Retira del banco`\n┃ 💰 /robar @tag\n┃ `Roba cada 10 min`\n┃ 💰 /regalar @tag (cantidad)\n┃ `Regala MC`\n┃ 💰 /prestamo (cantidad)\n┃ `Pide préstamo (máx 500)`\n┃ 💰 /pagar (cantidad/all)\n┃ `Paga tu deuda`\n┃ 💰 /deuda\n┃ `Consulta tu deuda`\n┃ 💰 /tienda\n┃ `Compra items útiles`\n┃ 💰 /comprar (item)\n┃ `Adquiere un item`\n┃ 💰 /inventario\n┃ `Ve tus items`\n┃ 💰 /mochila\n┃ `Ve tu mochila`\n┃ 💰 /slot (cantidad)\n┃ `Tragamonedas`\n┃ 💰 /ruletamik (cantidad) (rojo/negro)\n┃ `Ruleta de casino`\n┃ 💰 /dados (cantidad) (1-6)\n┃ `Apuesta a un número`\n┃ 💰 /ruletarusa (cantidad)\n┃ `Ruleta rusa x6`\n┃ 💰 /rank\n┃ `Ranking de los más ricos`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🎮 JUEGOS Y DIVERSIÓN 〕━━⊷\n┃ 🎮 /8ball (pregunta)\n┃ `La bola mágica`\n┃ 🎮 /dado\n┃ `Lanza un dado`\n┃ 🎮 /moneda\n┃ `Cara o cruz`\n┃ 🎮 /random (min) (max)\n┃ `Número aleatorio`\n┃ 🎮 /verdadoreto\n┃ `Verdad o reto`\n┃ 🎮 /top10 (tema)\n┃ `Top 10 aleatorio`\n┃ 🎮 /autoreact (emoji) on/off\n┃ `Reacciona a tus msgs`\n┃ 🎮 /gay @tag\n┃ `% de qué tan gay eres`\n┃ 🎮 /iq @tag\n┃ `% de tu IQ`\n┃ 🎮 /wordle\n┃ `Adivina la palabra`\n┃ 🎮 /ahorcado\n┃ `Juego del ahorcado`\n┃ 🎮 /ruleta\n┃ `Ruleta rusa`\n┃ 🎮 /trivia\n┃ `Preguntas de trivia`\n┃ 🎮 /ppt (piedra/papel/tijera)\n┃ `Juega contra el bot`\n┃ 🎮 /batalla @tag\n┃ `Pelea contra alguien`\n┃ 🎮 /ship @tag1 @tag2\n┃ `Porcentaje de amor`\n┃ 🎮 /pareja\n┃ `Pareja aleatoria`\n┃ 🎮 /chiste\n┃ `Chiste aleatorio`\n┃ 🎮 /frase\n┃ `Frase motivacional`\n┃ 🎮 /piropo\n┃ `Piropo aleatorio`\n┃ 🎮 /insulto @tag\n┃ `Insulto gracioso`\n┃ 🎮 /consejo\n┃ `Consejo para la vida`\n┃ 🎮 /dato\n┃ `Dato curioso`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🤖 INTELIGENCIA ARTIFICIAL 〕━━⊷\n┃ 🤖 /gemini (texto)\n┃ `Habla con Gemini AI`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 📥 DESCARGAS 〕━━⊷\n┃ 📥 /spotify (texto)\n┃ `Envía audio de Spotify`\n┃ 📥 /play (texto)\n┃ `Envía video de YouTube`\n┃ 📥 /playaudio (texto)\n┃ `Envía audio de YouTube`\n┃ 📥 /tt (link)\n┃ `Descarga TikTok sin marca`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🎬 ACCIONES 〕━━⊷\n┃ 🎬 /abrazar @tag\n┃ `Abraza a alguien`\n┃ 🎬 /besar @tag\n┃ `Besa a alguien`\n┃ 🎬 /pegar @tag\n┃ `Golpea a alguien`\n┃ 🎬 /patada @tag\n┃ `Da una patada`\n┃ 🎬 /llorar\n┃ `Te pones a llorar`\n┃ 🎬 /matar @tag\n┃ `Elimina a alguien`\n┃ 🎬 /ignorar @tag\n┃ `Ignora a alguien`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 📸 STICKERS 〕━━⊷\n┃ 📸 /nuevos comandos próximamente\n╰━━━━━━━━━━━━━━━━━━━⬣\n\nBy: Mikbot | By: mikelennn | By: 2941160601";
await sock.sendMessage(grupo,{image:fs.readFileSync('/storage/emulated/0/Pictures/1777754412038.png'),caption:menu,mentions:[sender]}).catch(async()=>{await sock.sendMessage(grupo,{text:menu,mentions:[sender]});});
await sock.sendMessage(grupo,{text:'📢 Canal: https://whatsapp.com/channel/0029Vb8Z3WqI7BeJbYIJHm20'});
await addXpBD();return;
}

// SPOTIFY, PLAY, PLAY AUDIO, TIKTOK, GEMINI, ADDBOT, ACCIONES, TRIVIA, WORDLE, AHORCADO, RULETA, JUEGOS SIMPLES...
// (El resto del código extenso se mantiene igual que en la última versión funcional)

iniciarBot().catch(err=>console.log('Error:',err));

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
const d=getDB(g,{warns:{},muted:[],modoadmins:false,banbot:[],antispam:false,antilinks:false,antistickers:false,antiimg:false,antivideos:false,antiaudios:false,welcome:false,despedida:false,welcomeMsg:'',despedidaMsg:'',autoreact:'',autoreactUser:'',xp:{},nivel:{},wordle:null,ahorcado:null,ruleta:null,trivia:null});
if(u.action==='add'&&d.welcome){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];let msgB=d.welcomeMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 🎉 *BIENVENIDO/A*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n✅ Bienvenido al grupo\n📌 Respeta las reglas';msgB=msgB.replace(/@user/g,'@'+num);await sock.sendMessage(g,{image:fs.readFileSync('/storage/emulated/0/Pictures/1778104477459.png'),caption:msgB,mentions:[jid]}).catch(async()=>{await sock.sendMessage(g,{text:msgB,mentions:[jid]});});}}
if(u.action==='remove'&&d.despedida){for(const user of u.participants){const jid=typeof user==='string'?user:(user.id||user.jid||String(user));const num=jid.split('@')[0];let msgD=d.despedidaMsg||'╭━━━━━━━━━━━━━━━⊷\n┃ 👋 *ADIÓS*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+num+'\n\n😢 Salió del grupo';msgD=msgD.replace(/@user/g,'@'+num);await sock.sendMessage(g,{image:fs.readFileSync('/storage/emulated/0/Pictures/1778101076566.png'),caption:msgD,mentions:[jid]}).catch(async()=>{await sock.sendMessage(g,{text:msgD,mentions:[jid]});});}}
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

if(d.autoreact&&d.autoreactUser===sender.split('@')[0]){try{await sock.sendMessage(grupo,{react:{text:d.autoreact,key:mensaje.key}});}catch(e){}}
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
const totalComandos=49;

async function addXpBD(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+10;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp20(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+20;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}
async function addXp30(){const uid=sender.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+30;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;setDB(grupo,d);try{await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[sender]});}catch(e){}}else{setDB(grupo,d);}}

if(texto===PREFIX+'menu'){
const num=sender.split('@')[0];
const nivelUsuario=(d.nivel&&d.nivel[num])||1;
const xpUsuario=(d.xp&&d.xp[num])||0;
const xpNecesario=nivelUsuario*100;
const menu="╭━━〔 👑 𝑴𝑰𝑲𝑩𝑶𝑻 👑 〕━━⊷\n┃ 👤 Usuario: @"+num+"\n┃ 🤖 Versión: Beta\n┃ 🧠 Comandos: "+totalComandos+"\n┃ 🏆 Nivel: "+nivelUsuario+"\n┃ ✨ XP: "+xpUsuario+"/"+xpNecesario+"\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 ⚙️ CONFIGURACIÓN 〕━━⊷\n┃ ⚙️ /welcome on/off\n┃ `Activa/desactiva bienvenidas`\n┃ ⚙️ /despedida on/off\n┃ `Activa/desactiva despedidas`\n┃ ⚙️ /setwelcome (mensaje)\n┃ `Personaliza la bienvenida`\n┃ ⚙️ /setdespedida (mensaje)\n┃ `Personaliza la despedida`\n┃ ⚙️ /welcomepredeterminado\n┃ `Restaura bienvenida por defecto`\n┃ ⚙️ /despedidapredeterminada\n┃ `Restaura despedida por defecto`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 👑 ADMINISTRACIÓN 〕━━⊷\n┃ 👑 /promote @tag\n┃ `Da admin al usuario`\n┃ 👑 /demote @tag\n┃ `Quita admin al usuario`\n┃ 👑 /cerrar\n┃ `Cierra el grupo`\n┃ 👑 /abrir\n┃ `Abre el grupo`\n┃ 👑 /kick @tag\n┃ `Expulsa al usuario`\n┃ 👑 /mute @tag\n┃ `Silencia al usuario`\n┃ 👑 /unmute @tag\n┃ `Desilencia al usuario`\n┃ 👑 /warn @tag\n┃ `Advierte al usuario`\n┃ 👑 /unwarn @tag\n┃ `Quita advertencia`\n┃ 👑 /warnlist\n┃ `Lista de advertencias`\n┃ 👑 /hide\n┃ `Elimina mensaje respondido`\n┃ 👑 /modoadmins on/off\n┃ `Solo admins usan el bot`\n┃ 👑 /banbot @tag\n┃ `Banea del bot`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🛡️ PROTECCIÓN 〕━━⊷\n┃ 🛡 /antispam on/off\n┃ `4 msg en 10s = warn`\n┃ 🛡 /antilinks on/off\n┃ `Warn por links`\n┃ 🛡 /antistickers on/off\n┃ `Warn por stickers`\n┃ 🛡 /antiimg on/off\n┃ `Warn por imágenes`\n┃ 🛡 /antivideos on/off\n┃ `Warn por videos`\n┃ 🛡 /antiaudios on/off\n┃ `Warn por audios`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🎮 JUEGOS Y DIVERSIÓN 〕━━⊷\n┃ 🎮 /8ball (pregunta)\n┃ `La bola mágica`\n┃ 🎮 /dado\n┃ `Lanza un dado`\n┃ 🎮 /moneda\n┃ `Cara o cruz`\n┃ 🎮 /random (min) (max)\n┃ `Número aleatorio`\n┃ 🎮 /verdadoreto\n┃ `Verdad o reto`\n┃ 🎮 /top10 (tema)\n┃ `Top 10 aleatorio`\n┃ 🎮 /autoreact (emoji) on/off\n┃ `Reacciona a tus msgs`\n┃ 🎮 /gay @tag\n┃ `% de qué tan gay eres`\n┃ 🎮 /iq @tag\n┃ `% de tu IQ`\n┃ 🎮 /wordle\n┃ `Adivina la palabra`\n┃ 🎮 /ahorcado\n┃ `Juego del ahorcado`\n┃ 🎮 /ruleta\n┃ `Ruleta rusa`\n┃ 🎮 /trivia\n┃ `Preguntas de trivia`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 📥 DESCARGAS 〕━━⊷\n┃ 📥 /spotify (texto)\n┃ `Envía audio de Spotify`\n┃ 📥 /play (texto)\n┃ `Envía video de YouTube`\n┃ 📥 /playaudio (texto)\n┃ `Envía audio de YouTube`\n┃ 📥 /tt (link)\n┃ `Descarga TikTok sin marca`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 📸 STICKERS 〕━━⊷\n┃ 📸 /brat (texto)\n┃ `Sticker estilo brat`\n┃ 📸 /s (responder imagen)\n┃ `Imagen a sticker`\n┃ 📸 /toimg (responder sticker)\n┃ `Sticker a imagen`\n╰━━━━━━━━━━━━━━━━━━━⬣\n\n╭━━〔 🎬 ACCIONES 〕━━⊷\n┃ 🎬 /nuevos comandos próximamente\n╰━━━━━━━━━━━━━━━━━━━⬣\n\nBy: Mikbot | By: mikelennn | By: 2941160601";
await sock.sendMessage(grupo,{image:fs.readFileSync('/storage/emulated/0/Pictures/1777754412038.png'),caption:menu,mentions:[sender]}).catch(async()=>{await sock.sendMessage(grupo,{text:menu,mentions:[sender]});});
await sock.sendMessage(grupo,{text:'📢 Canal: https://whatsapp.com/channel/0029Vb8Z3WqI7BeJbYIJHm20'});
await addXpBD();return;
}

// SPOTIFY
if(cmd===PREFIX+'spotify'){
const query=texto.slice(9);
if(!query)return await sock.sendMessage(grupo,{text:'🎵 Usa: /spotify (nombre)'});
try{
const key='sasuke';
const sr=await axios.get('https://api.evogb.org/search/spotify?query='+encodeURIComponent(query)+'&key='+key);
if(!sr.data.status||!sr.data.result.length)return await sock.sendMessage(grupo,{text:'❌ No encontrado'});
const t=sr.data.result[0];
const dr=await axios.get('https://api.evogb.org/dl/spotify?url='+encodeURIComponent('https://open.spotify.com/track/'+t.id)+'&key='+key);
if(!dr.data.status)return await sock.sendMessage(grupo,{text:'❌ Error al descargar'});
const dt=dr.data.data;
await sock.sendMessage(grupo,{image:{url:dt.imageHD||dt.image},caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎵 *SPOTIFY*\n╰━━━━━━━━━━━━━━━⬣\n\n🎵 '+dt.name+'\n👤 '+dt.artist+'\n💿 '+dt.album});
await sock.sendMessage(grupo,{audio:{url:dt.url},mimetype:'audio/mpeg',fileName:dt.name+'.mp3'});
}catch(e){await sock.sendMessage(grupo,{text:'❌ Spotify no disponible'});}
return;
}

// PLAY VIDEO
if(cmd===PREFIX+'play'){
const busqueda=texto.slice(6);
if(!busqueda)return await sock.sendMessage(grupo,{text:'🎬 Usa: /play (nombre)'});
try{
let vu=busqueda;
if(!busqueda.match(/youtu/gi)){const r=await yts(busqueda);if(!r.all.length)return await sock.sendMessage(grupo,{text:'❌ Sin resultados'});vu=r.videos[0].url;}
const api='https://api.delirius.store/download/ytmp4?url='+encodeURIComponent(vu)+'&format=360p';
const res=await fetch(api);const json=await res.json();
if(!json.status||!json.data)return await sock.sendMessage(grupo,{text:'❌ Error'});
await sock.sendMessage(grupo,{video:{url:json.data.download},caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎬 *VIDEO*\n╰━━━━━━━━━━━━━━━⬣\n\n🎬 '+json.data.title,mimetype:'video/mp4'});
}catch(e){await sock.sendMessage(grupo,{text:'❌ Error: '+e.message});}
return;
}

// PLAY AUDIO
if(cmd===PREFIX+'playaudio'){
const busqueda=texto.slice(11);
if(!busqueda)return await sock.sendMessage(grupo,{text:'🎵 Usa: /playaudio (nombre)'});
try{
let vu=busqueda;
if(!busqueda.match(/youtu/gi)){const r=await yts(busqueda);if(!r.all.length)return await sock.sendMessage(grupo,{text:'❌ Sin resultados'});vu=r.videos[0].url;}
const api='https://api.delirius.store/download/ytmp3?url='+encodeURIComponent(vu);
const res=await fetch(api);const json=await res.json();
if(!json.status||!json.data)return await sock.sendMessage(grupo,{text:'❌ Error'});
await sock.sendMessage(grupo,{image:{url:json.data.image},caption:'╭━━━━━━━━━━━━━━━⊷\n┃ 🎵 *AUDIO*\n╰━━━━━━━━━━━━━━━⬣\n\n🎵 '+json.data.title+'\n👤 '+json.data.author});
await sock.sendMessage(grupo,{audio:{url:json.data.download},mimetype:'audio/mpeg',fileName:json.data.title+'.mp3'});
}catch(e){await sock.sendMessage(grupo,{text:'❌ Error: '+e.message});}
return;
}

// TIKTOK
if(cmd===PREFIX+'tt'){
const link=texto.slice(4);
if(!link)return await sock.sendMessage(grupo,{text:'🎵 Usa: /tt (link de TikTok)'});
await sock.sendMessage(grupo,{text:'⏳ Descargando TikTok...'});
const output='/storage/emulated/0/Download/tiktok_'+Date.now()+'.mp4';
const { exec } = require('child_process');
exec('python -m yt_dlp -o "'+output+'" '+link, async (err) => {
if(err){await sock.sendMessage(grupo,{text:'❌ Error al descargar'});return;}
await sock.sendMessage(grupo,{video:{url:output},caption:'🎵 TikTok'});});
return;
}

undefined
if(cmd===PREFIX+'trivia'){
if(d.trivia)return await sock.sendMessage(grupo,{text:'❓ Ya hay una trivia activa. Responde con /rtrivia a/b/c/d'});
const preguntas=[{p:'¿Capital de Francia?',a:'Londres',b:'París',c:'Madrid',d:'Roma',r:'b'},{p:'¿Planetas del sistema solar?',a:'7',b:'9',c:'8',d:'10',r:'c'},{p:'¿Quién pintó la Mona Lisa?',a:'Picasso',b:'Van Gogh',c:'Da Vinci',d:'Dalí',r:'c'},{p:'¿Océano más grande?',a:'Atlántico',b:'Índico',c:'Ártico',d:'Pacífico',r:'d'},{p:'¿Año del hombre en la luna?',a:'1965',b:'1969',c:'1971',d:'1975',r:'b'},{p:'¿Animal más rápido?',a:'León',b:'Guepardo',c:'Águila',d:'Tiburón',r:'b'},{p:'¿Huesos del cuerpo humano?',a:'186',b:'196',c:'206',d:'216',r:'c'},{p:'¿País más grande?',a:'China',b:'EEUU',c:'Canadá',d:'Rusia',r:'d'},{p:'¿Autor de Romeo y Julieta?',a:'Cervantes',b:'Shakespeare',c:'Dante',d:'Homero',r:'b'},{p:'¿Elemento químico del agua?',a:'O2',b:'CO2',c:'H2O',d:'NaCl',r:'c'}];
const pr=preguntas[Math.floor(Math.random()*preguntas.length)];
d.trivia={correcta:pr.r,tiempo:Date.now()+30000,activo:true};
setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ❓ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n📝 '+pr.p+'\n\n🅰️ '+pr.a+'\n🅱️ '+pr.b+'\n©️ '+pr.c+'\n🅳️ '+pr.d+'\n\n⏰ 30 segundos\n💡 /rtrivia a/b/c/d'});
return;
}
if(cmd===PREFIX+'rtrivia'&&d.trivia&&d.trivia.activo){
const resp=args[1]?.toLowerCase();
if(!resp||!['a','b','c','d'].includes(resp))return await sock.sendMessage(grupo,{text:'❓ /rtrivia a, b, c o d'});
if(Date.now()>d.trivia.tiempo){const rc=d.trivia.correcta;delete d.trivia;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⏰ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n⏰ Se acabó el tiempo\n📌 Era: '+rc});return;}
if(resp===d.trivia.correcta){delete d.trivia;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ❓ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ ¡Correcto!\n✨ +20 XP'});await addXp20();return;}
delete d.trivia;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ❌ *TRIVIA*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Incorrecto\n📌 Era: '+d.trivia.correcta});return;
}

// WORDLE
if(cmd===PREFIX+'wordle'||cmd===PREFIX+'wordlepalabra'){
if(cmd===PREFIX+'wordle'){
if(args[1]==='rendirse'&&d.wordle){const p=d.wordle.palabra;delete d.wordle;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n😢 Te rendiste\n📌 Era: '+p});return;}
if(d.wordle)return await sock.sendMessage(grupo,{text:'🟩 Ya hay wordle. /wordlepalabra (palabra) o /wordle rendirse'});
const palabras=['perro','gatos','casas','silla','mesas','raton','tecla','piano','playa','monta','campo','flora','nubes','soles','lunas','verde','rojas','aguas','fuego','tigre','libro','hojas','reloj','ancla','bruja','dados','fruta','huevo','queso','reyes'];
const p=palabras[Math.floor(Math.random()*palabras.length)];
d.wordle={palabra:p,intentos:0,maxIntentos:5,activo:true};setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n🔤 5 letras\n🎯 5 intentos\n💡 /wordlepalabra (palabra)\n🏳️ /wordle rendirse'});return;
}
if(cmd===PREFIX+'wordlepalabra'&&d.wordle&&d.wordle.activo){
d.wordle.intentos++;const intento=args[1]?.toLowerCase();
if(!intento||intento.length!==5)return await sock.sendMessage(grupo,{text:'🟩 /wordlepalabra (palabra de 5 letras)'});
const palabra=d.wordle.palabra;let resultado='';
for(let i=0;i<5;i++){if(intento[i]===palabra[i])resultado+='🟩';else if(palabra.includes(intento[i]))resultado+='🟨';else resultado+='⬛';}
if(intento===palabra){delete d.wordle;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ ¡Correcto!\n📌 '+palabra+'\n✨ +20 XP'});await addXp20();return;}
if(d.wordle.intentos>=d.wordle.maxIntentos){const p3=d.wordle.palabra;delete d.wordle;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n😢 Perdiste\n📌 Era: '+p3});return;}
setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🟩 *WORDLE*\n╰━━━━━━━━━━━━━━━⬣\n\n'+resultado+'\n🎯 Intento '+d.wordle.intentos+'/'+d.wordle.maxIntentos+'\n💡 /wordlepalabra (palabra)'});return;
}
}

// AHORCADO
if(cmd===PREFIX+'ahorcado'){
if(d.ahorcado)return await sock.sendMessage(grupo,{text:'💀 Ya hay ahorcado. /ahorcadopalabra o /ahorcadoletra'});
const palabras=['murcielago','mariposa','elefante','televisor','biblioteca','zanahoria','cocodrilo','hipopotamo','estudiante','guitarra','chocolate','campana','palmera','dinosaurio','helicoptero','microfono','lagartija','primavera','relampago','xilofono','rompecabezas','computadora','astronauta','laberinto','tiburon'];
const p=palabras[Math.floor(Math.random()*palabras.length)];
d.ahorcado={palabra:p,letrasAdivinadas:[],errores:0,maxErrores:6,activo:true};setDB(grupo,d);
let m='';for(const l of p){m+=d.ahorcado.letrasAdivinadas.includes(l)?l+' ':'_ ';}
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n\n💡 /ahorcadoletra (letra)\n💡 /ahorcadopalabra (palabra)'});return;
}
if(cmd===PREFIX+'ahorcadoletra'&&d.ahorcado&&d.ahorcado.activo){
const letra=args[1]?.toLowerCase();if(!letra||letra.length!==1)return await sock.sendMessage(grupo,{text:'💀 /ahorcadoletra (letra)'});
if(d.ahorcado.letrasAdivinadas.includes(letra))return await sock.sendMessage(grupo,{text:'⚠️ Ya usaste esa letra'});
d.ahorcado.letrasAdivinadas.push(letra);if(!d.ahorcado.palabra.includes(letra))d.ahorcado.errores++;
let m='';for(const l of d.ahorcado.palabra){m+=d.ahorcado.letrasAdivinadas.includes(l)?l+' ':'_ ';}
if(!m.includes('_')){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ ¡Ganaste!\n📌 '+p2+'\n✨ +20 XP'});await addXp20();return;}
if(d.ahorcado.errores>=d.ahorcado.maxErrores){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n😢 Perdiste\n📌 Era: '+p2});return;}
setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n❌ Errores: '+d.ahorcado.errores+'/'+d.ahorcado.maxErrores});return;
}
if(cmd===PREFIX+'ahorcadopalabra'&&d.ahorcado&&d.ahorcado.activo){
const intento=args.slice(1).join(' ').toLowerCase();if(!intento)return await sock.sendMessage(grupo,{text:'💀 /ahorcadopalabra (palabra)'});
if(intento===d.ahorcado.palabra){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ ¡Correcto!\n📌 '+p2+'\n✨ +20 XP'});await addXp20();return;}
d.ahorcado.errores++;if(d.ahorcado.errores>=d.ahorcado.maxErrores){const p2=d.ahorcado.palabra;delete d.ahorcado;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n😢 Incorrecto\n📌 Era: '+p2});return;}
setDB(grupo,d);let m='';for(const l of d.ahorcado.palabra){m+=d.ahorcado.letrasAdivinadas.includes(l)?l+' ':'_ ';}
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *AHORCADO*\n╰━━━━━━━━━━━━━━━⬣\n\n'+m+'\n❌ Errores: '+d.ahorcado.errores+'/'+d.ahorcado.maxErrores});return;
}

await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ⚠️ *ADVERTENCIA*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Warns: '+d.warns[t]+'\n💡 /unwarn @tag para quitar',mentions:[t]});}
if(cmd===PREFIX+'unwarn'&&mencionados.length>0){const t=mencionados[0];if(d.warns[t]>0){d.warns[t]--;if(d.warns[t]===0)delete d.warns[t];setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *WARN RETIRADA*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 '+mencion(t)+'\n📊 Warns: '+(d.warns[t]||0),mentions:[t]});}else await sock.sendMessage(grupo,{text:'❌ No tiene warns'});}
if(cmd===PREFIX+'warnlist'){let l='╭━━━━━━━━━━━━━━━⊷\n┃ 📋 *LISTA DE WARNS*\n╰━━━━━━━━━━━━━━━⬣\n\n';const w=Object.entries(d.warns);if(w.length===0)l+='✅ No hay warns';else w.forEach(([u,c],i)=>l+=(i+1)+'. '+mencion(u)+': '+c+'\n');await sock.sendMessage(grupo,{text:l});}
if(cmd===PREFIX+'hide'){const q=mensaje.message.extendedTextMessage?.contextInfo?.stanzaId;const qs2=mensaje.message.extendedTextMessage?.contextInfo?.participant;if(q&&!admins.includes(qs2))await sock.sendMessage(grupo,{delete:{remoteJid:grupo,fromMe:false,id:q,participant:qs2}});}
if(cmd===PREFIX+'modoadmins'){if(args[1]==='on'){d.modoadmins=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👑 *MODO ADMINS*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Solo admins usan el bot\n💡 /modoadmins off para desactivar'});}if(args[1]==='off'){d.modoadmins=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 👥 *MODO LIBRE*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Todos usan el bot\n💡 /modoadmins on para restringir'});}}
if(cmd===PREFIX+'banbot'&&mencionados.length>0){const t=mencionados[0];if(admins.includes(t))return await sock.sendMessage(grupo,{text:'❌ No puedes banear admin'});if(!d.banbot.includes(t)){d.banbot.push(t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🚫 *BANEADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' no puede usar el bot\n💡 /banbot @tag para desbanear',mentions:[t]});}else{d.banbot=d.banbot.filter(u=>u!==t);setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *DESBANEADO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ '+mencion(t)+' puede usar el bot',mentions:[t]});}}

// PROTECCIÓN
const prot={antispam:'🛡️',antilinks:'🔗',antistickers:'📸',antiimg:'🖼️',antivideos:'🎬',antiaudios:'🎵'};
for(const[k,ico]of Object.entries(prot)){if(cmd===PREFIX+k){if(args[1]==='on'){d[k]=true;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ '+ico+' *'+k.toUpperCase()+'*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Activado\n💡 /'+k+' off para desactivar'});}if(args[1]==='off'){d[k]=false;setDB(grupo,d);await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ '+ico+' *'+k.toUpperCase()+'*\n╰━━━━━━━━━━━━━━━⬣\n\n❌ Desactivado\n💡 /'+k+' on para activar'});}}}
});
}

async function dispararRuleta(sock,grupo,d){
if(!d.ruleta||!d.ruleta.activo)return;
if(d.ruleta.jugadores.length<=1){
const ganador=d.ruleta.jugadores[0];
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n🏆 @'+ganador.split('@')[0]+' GANÓ\n✨ +30 XP',mentions:[ganador]});
const uid=ganador.split('@')[0];d.xp=d.xp||{};d.nivel=d.nivel||{};d.xp[uid]=(d.xp[uid]||0)+30;d.nivel[uid]=d.nivel[uid]||1;const xpN=d.nivel[uid]*100;if(d.xp[uid]>=xpN){d.xp[uid]-=xpN;d.nivel[uid]++;await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *¡SUBIÓ DE NIVEL!*\n╰━━━━━━━━━━━━━━━⬣\n\n👤 @'+uid+'\n📊 Nivel: '+d.nivel[uid]+'\n✨ XP: '+d.xp[uid]+'/'+d.nivel[uid]*100,mentions:[ganador]});}
delete d.ruleta;setDB(grupo,d);return;
}
const idx=Math.floor(Math.random()*d.ruleta.jugadores.length);
const eliminado=d.ruleta.jugadores[idx];
d.ruleta.jugadores.splice(idx,1);setDB(grupo,d);
await sock.sendMessage(grupo,{text:'╭━━━━━━━━━━━━━━━⊷\n┃ 💀 *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n💀 @'+eliminado.split('@')[0]+' eliminado\n👥 Quedan: '+d.ruleta.jugadores.length,mentions:[eliminado]});
setTimeout(()=>dispararRuleta(sock,grupo,d),5000);
}

iniciarBot().catch(err=>console.log('Error:',err));

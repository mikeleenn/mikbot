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

const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { LocalStorage } = require('node-localstorage');
const db = new LocalStorage('./database');
const axios = require('axios');
const fetch = require('node-fetch');
const yts = require('yt-search');
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

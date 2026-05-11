module.exports = function(sock, getDB, setDB, PREFIX) {
    return {
        handleCommand: async function(cmd, args, d, grupo, sender, mencionados, mencion) {
            const uid = sender.split('@')[0];
            d.mikcoins = d.mikcoins || {};
            d.mikbank = d.mikbank || {};
            d.dailyCooldown = d.dailyCooldown || {};
            d.minarCooldown = d.minarCooldown || {};
            d.workCooldown = d.workCooldown || {};
            d.crimeCooldown = d.crimeCooldown || {};
            d.robarCooldown = d.robarCooldown || {};
            d.deuda = d.deuda || {};
            d.escudoAntiRobo = d.escudoAntiRobo || {};
            d.picoMejorado = d.picoMejorado || {};
            d.monedero = d.monedero || {};
            d.boostXP = d.boostXP || {};
            d.loteria = d.loteria || {};
            d.mochila = d.mochila || {};
            d.picoDiamante = d.picoDiamante || {};
            const ahora = Date.now();
            let r = null;

            if (cmd === PREFIX + 'daily') {
                if (d.dailyCooldown[uid] && ahora - d.dailyCooldown[uid] < 86400000) {
                    const falta = Math.ceil((86400000 - (ahora - d.dailyCooldown[uid])) / 3600000);
                    r = { text: '⏳ Espera ' + falta + ' horas para /daily' };
                } else {
                    d.mikcoins[uid] = (d.mikcoins[uid] || 0) + 100;
                    d.dailyCooldown[uid] = ahora;
                    r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🎁 *DAILY*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Recibiste 100 MC\n💰 Saldo: ' + d.mikcoins[uid] + ' MC' };
                }
            } else if (cmd === PREFIX + 'minar') {
                if (d.minarCooldown[uid] && ahora - d.minarCooldown[uid] < 1800000) {
                    const falta = Math.ceil((1800000 - (ahora - d.minarCooldown[uid])) / 60000);
                    r = { text: '⏳ Espera ' + falta + ' min para /minar' };
                } else {
                    let g = Math.floor(Math.random() * 91) + 10;
                    if (d.picoMejorado[uid] > 0) { g *= 2; d.picoMejorado[uid]--; }
                    if (d.picoDiamante[uid]) g *= 2;
                    d.mikcoins[uid] = (d.mikcoins[uid] || 0) + g;
                    d.minarCooldown[uid] = ahora;
                    r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ ⛏️ *MINAR*\n╰━━━━━━━━━━━━━━━⬣\n\n⛏️ Minaste ' + g + ' MC\n💰 Saldo: ' + d.mikcoins[uid] + ' MC' };
                }
            } else if (cmd === PREFIX + 'work') {
                if (d.workCooldown[uid] && ahora - d.workCooldown[uid] < 3600000) {
                    const falta = Math.ceil((3600000 - (ahora - d.workCooldown[uid])) / 60000);
                    r = { text: '⏳ Espera ' + falta + ' min para /work' };
                } else {
                    let g = Math.floor(Math.random() * 101) + 50;
                    if (d.monedero[uid]) g = Math.floor(g * 1.1);
                    d.mikcoins[uid] = (d.mikcoins[uid] || 0) + g;
                    d.workCooldown[uid] = ahora;
                    r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 💼 *WORK*\n╰━━━━━━━━━━━━━━━⬣\n\n💼 Trabajaste: ' + g + ' MC\n💰 Saldo: ' + d.mikcoins[uid] + ' MC' };
                }
            } else if (cmd === PREFIX + 'crime') {
                if (d.crimeCooldown[uid] && ahora - d.crimeCooldown[uid] < 7200000) {
                    const falta = Math.ceil((7200000 - (ahora - d.crimeCooldown[uid])) / 60000);
                    r = { text: '⏳ Espera ' + falta + ' min para /crime' };
                } else {
                    d.crimeCooldown[uid] = ahora;
                    if (Math.random() < 0.6) {
                        const g = Math.floor(Math.random() * 151) + 200;
                        d.mikcoins[uid] = (d.mikcoins[uid] || 0) + g;
                        r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🦹 *CRIME*\n╰━━━━━━━━━━━━━━━⬣\n\n💰 Robaste ' + g + ' MC\n💸 Saldo: ' + d.mikcoins[uid] + ' MC' };
                    } else {
                        const p = Math.floor(Math.random() * 81) + 100;
                        d.mikcoins[uid] = Math.max(0, (d.mikcoins[uid] || 0) - p);
                        r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🚔 *CRIME*\n╰━━━━━━━━━━━━━━━⬣\n\n👮 Te atraparon\n💸 Perdiste ' + p + ' MC\n💰 Saldo: ' + d.mikcoins[uid] + ' MC' };
                    }
                }
            } else if (cmd === PREFIX + 'banco') {
                const cash = d.mikcoins[uid] || 0;
                const bank = d.mikbank[uid] || 0;
                r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🏦 *BANCO*\n╰━━━━━━━━━━━━━━━⬣\n\n💰 En mano: ' + cash + ' MC\n🔒 En banco: ' + bank + ' MC\n💎 Total: ' + (cash + bank) + ' MC' };
            } else if (cmd === PREFIX + 'depositar') {
                const param = args[1];
                const cash = d.mikcoins[uid] || 0;
                let cantidad = (param === 'all' || param === 'todo') ? cash : parseInt(param);
                if (!cantidad || cantidad <= 0) {
                    r = { text: '❌ Usa: /depositar (cantidad/all)' };
                } else if (cantidad > cash) {
                    r = { text: '❌ No tienes esa cantidad' };
                } else {
                    d.mikcoins[uid] -= cantidad;
                    d.mikbank[uid] = (d.mikbank[uid] || 0) + cantidad;
                    r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🏦 *DEPÓSITO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Depositaste ' + cantidad + ' MC\n💰 En mano: ' + d.mikcoins[uid] + '\n🔒 En banco: ' + d.mikbank[uid] };
                }
            } else if (cmd === PREFIX + 'sacar') {
                const param = args[1];
                const bank = d.mikbank[uid] || 0;
                let cantidad = (param === 'all' || param === 'todo') ? bank : parseInt(param);
                if (!cantidad || cantidad <= 0) {
                    r = { text: '❌ Usa: /sacar (cantidad/all)' };
                } else if (cantidad > bank) {
                    r = { text: '❌ No tienes esa cantidad en el banco' };
                } else {
                    d.mikbank[uid] -= cantidad;
                    d.mikcoins[uid] = (d.mikcoins[uid] || 0) + cantidad;
                    r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🏦 *RETIRO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Retiraste ' + cantidad + ' MC\n💰 En mano: ' + d.mikcoins[uid] + '\n🔒 En banco: ' + d.mikbank[uid] };
                }
            } else if (cmd === PREFIX + 'prestamo') {
                const cantidad = parseInt(args[1]);
                if (!cantidad || cantidad <= 0 || cantidad > 500) {
                    r = { text: '❌ /prestamo (cantidad) - Máx 500 MC' };
                } else if (d.deuda[uid] > 0) {
                    r = { text: '❌ Ya debes ' + d.deuda[uid] + ' MC. Usa /pagar' };
                } else {
                    d.mikcoins[uid] = (d.mikcoins[uid] || 0) + cantidad;
                    d.deuda[uid] = Math.floor(cantidad * 1.2);
                    r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🏦 *PRÉSTAMO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Recibiste ' + cantidad + ' MC\n💸 A pagar: ' + d.deuda[uid] + ' (20% interés)' };
                }
            } else if (cmd === PREFIX + 'pagar') {
                const param = args[1];
                const deuda = d.deuda[uid] || 0;
                if (deuda === 0) {
                    r = { text: '✅ No tienes deudas' };
                } else {
                    let cantidad = (param === 'all' || param === 'todo') ? Math.min(deuda, d.mikcoins[uid] || 0) : parseInt(param);
                    if (!cantidad || cantidad <= 0) {
                        r = { text: '❌ Usa: /pagar (cantidad/all)' };
                    } else if (cantidad > (d.mikcoins[uid] || 0)) {
                        r = { text: '❌ No tienes suficiente dinero' };
                    } else {
                        d.mikcoins[uid] -= cantidad;
                        d.deuda[uid] -= cantidad;
                        if (d.deuda[uid] <= 0) d.deuda[uid] = 0;
                        r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 💸 *PAGO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Pagaste ' + cantidad + ' MC\n💸 Deuda: ' + d.deuda[uid] + ' MC' };
                    }
                }
            } else if (cmd === PREFIX + 'deuda') {
                const deuda = d.deuda[uid] || 0;
                r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 💸 *DEUDA*\n╰━━━━━━━━━━━━━━━⬣\n\n' + (deuda > 0 ? '💸 Debes: ' + deuda + ' MC' : '✅ No tienes deudas') };
            } else if (cmd === PREFIX + 'robar') {
                const t = mencionados.length > 0 ? mencionados[0] : null;
                if (!t) {
                    r = { text: '❌ Menciona a quién robar\n📌 /robar @tag' };
                } else if (t === sender) {
                    r = { text: '❌ No puedes robarte' };
                } else {
                    const tuid = t.split('@')[0];
                    if (d.escudoAntiRobo[tuid] > ahora) {
                        r = { text: '🛡️ ' + mencion(t) + ' tiene escudo anti-robo' };
                    } else if (d.robarCooldown[uid] && ahora - d.robarCooldown[uid] < 600000) {
                        const falta = Math.ceil((600000 - (ahora - d.robarCooldown[uid])) / 60000);
                        r = { text: '⏳ Espera ' + falta + ' min para /robar' };
                    } else {
                        const cashVictima = d.mikcoins[tuid] || 0;
                        if (cashVictima < 10) {
                            r = { text: '❌ ' + mencion(t) + ' no tiene suficiente dinero en mano' };
                        } else {
                            d.robarCooldown[uid] = ahora;
                            if (Math.random() < 0.5) {
                                const robado = Math.floor(Math.random() * 41) + 10;
                                if (robado > cashVictima) d.mikcoins[tuid] = 0;
                                else d.mikcoins[tuid] -= robado;
                                d.mikcoins[uid] = (d.mikcoins[uid] || 0) + robado;
                                r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🦹 *ROBO*\n╰━━━━━━━━━━━━━━━⬣\n\n💰 Robaste ' + robado + ' MC a ' + mencion(t) + '\n💸 Tu saldo: ' + d.mikcoins[uid] };
                            } else {
                                const perdida = Math.floor(Math.random() * 16) + 15;
                                d.mikcoins[uid] = Math.max(0, (d.mikcoins[uid] || 0) - perdida);
                                r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🚔 *ROBO*\n╰━━━━━━━━━━━━━━━⬣\n\n👮 Te atraparon\n💸 Perdiste ' + perdida + ' MC' };
                            }
                        }
                    }
                }
            } else if (cmd === PREFIX + 'regalar') {
                const t = mencionados.length > 0 ? mencionados[0] : null;
                const cantidad = parseInt(args[2]);
                if (!t || !cantidad || cantidad <= 0) {
                    r = { text: '❌ /regalar @tag (cantidad)' };
                } else if ((d.mikcoins[uid] || 0) < cantidad) {
                    r = { text: '❌ No tienes suficientes MC en mano' };
                } else {
                    const tuid = t.split('@')[0];
                    d.mikcoins[uid] -= cantidad;
                    d.mikcoins[tuid] = (d.mikcoins[tuid] || 0) + cantidad;
                    r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🎁 *REGALO*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Regalaste ' + cantidad + ' MC a ' + mencion(t) + '\n💰 Tu saldo: ' + d.mikcoins[uid] };
                }
            } else if (cmd === PREFIX + 'tienda') {
                r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🏪 *TIENDA*\n╰━━━━━━━━━━━━━━━⬣\n\n🛡️ escudo - 500 MC\n⛏️ pico - 300 MC\n💰 monedero - 200 MC\n🌟 boost - 400 MC\n🎫 loteria - 100 MC\n💎 diamante - 1000 MC\n🎒 mochila - 150 MC\n\n💡 /comprar (item)' };
            } else if (cmd === PREFIX + 'comprar') {
                const item = args[1]?.toLowerCase();
                const precios = { escudo: 500, pico: 300, monedero: 200, boost: 400, loteria: 100, diamante: 1000, mochila: 150 };
                if (!item || !precios[item]) {
                    r = { text: '❌ Item no encontrado. /tienda' };
                } else if ((d.mikcoins[uid] || 0) < precios[item]) {
                    r = { text: '❌ Te faltan ' + (precios[item] - (d.mikcoins[uid] || 0)) + ' MC' };
                } else {
                    d.mikcoins[uid] -= precios[item];
                    if (item === 'escudo') d.escudoAntiRobo[uid] = ahora + 86400000;
                    if (item === 'pico') d.picoMejorado[uid] = (d.picoMejorado[uid] || 0) + 3;
                    if (item === 'monedero') d.monedero[uid] = true;
                    if (item === 'boost') d.boostXP[uid] = ahora + 3600000;
                    if (item === 'loteria') d.loteria[uid] = (d.loteria[uid] || 0) + 1;
                    if (item === 'diamante') d.picoDiamante[uid] = true;
                    if (item === 'mochila') d.mochila[uid] = (d.mochila[uid] || 0) + 1;
                    r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ ✅ *COMPRA*\n╰━━━━━━━━━━━━━━━⬣\n\n✅ Compraste ' + item + '\n💰 Saldo: ' + d.mikcoins[uid] };
                }
            } else if (cmd === PREFIX + 'inventario') {
                let inv = '╭━━━━━━━━━━━━━━━⊷\n┃ 🎒 *INVENTARIO*\n╰━━━━━━━━━━━━━━━⬣\n\n';
                inv += '🛡️ Escudo: ' + (d.escudoAntiRobo[uid] > ahora ? Math.ceil((d.escudoAntiRobo[uid] - ahora) / 3600000) + 'h' : '❌') + '\n';
                inv += '⛏️ Pico: ' + (d.picoMejorado[uid] || 0) + ' usos\n';
                inv += '💰 Monedero: ' + (d.monedero[uid] ? '✅' : '❌') + '\n';
                inv += '🌟 Boost XP: ' + (d.boostXP[uid] > ahora ? Math.ceil((d.boostXP[uid] - ahora) / 60000) + 'min' : '❌') + '\n';
                inv += '🎫 Loteria: ' + (d.loteria[uid] || 0) + ' tickets\n';
                inv += '🎒 Mochila: ' + (d.mochila[uid] || 0) + ' espacios\n';
                inv += '💎 Pico Diamante: ' + (d.picoDiamante[uid] ? '✅' : '❌') + '\n';
                r = { text: inv };
            } else if (cmd === PREFIX + 'slot') {
                const cantidad = parseInt(args[1]);
                if (!cantidad || cantidad < 10) {
                    r = { text: '🎰 /slot (cantidad) - Mín 10 MC' };
                } else if ((d.mikcoins[uid] || 0) < cantidad) {
                    r = { text: '❌ No tienes suficientes MC' };
                } else {
                    d.mikcoins[uid] -= cantidad;
                    const emojis = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
                    const r1 = emojis[Math.floor(Math.random() * 6)];
                    const r2 = emojis[Math.floor(Math.random() * 6)];
                    const r3 = emojis[Math.floor(Math.random() * 6)];
                    let premio = 0;
                    if (r1 === r2 && r2 === r3) {
                        if (r1 === '💎') premio = cantidad * 10;
                        else if (r1 === '7️⃣') premio = cantidad * 5;
                        else premio = cantidad * 3;
                    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
                        premio = Math.floor(cantidad * 1.5);
                    }
                    d.mikcoins[uid] += premio;
                    r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🎰 *SLOT*\n╰━━━━━━━━━━━━━━━⬣\n\n🎰 ' + r1 + ' ' + r2 + ' ' + r3 + '\n💰 Premio: ' + premio + ' MC\n💸 Saldo: ' + d.mikcoins[uid] };
                }
            } else if (cmd === PREFIX + 'ruletamik') {
                const cantidad = parseInt(args[1]);
                const color = args[2]?.toLowerCase();
                if (!cantidad || cantidad < 10 || !color || (color !== 'rojo' && color !== 'negro')) {
                    r = { text: '🎡 /ruletamik (cantidad) (rojo/negro) - Mín 10 MC' };
                } else if ((d.mikcoins[uid] || 0) < cantidad) {
                    r = { text: '❌ No tienes suficientes MC' };
                } else {
                    d.mikcoins[uid] -= cantidad;
                    const resultado = Math.random() < 0.5 ? 'rojo' : 'negro';
                    if (color === resultado) {
                        d.mikcoins[uid] += cantidad * 2;
                        r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🎡 *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n🔴🔵 Salió: ' + resultado + '\n✅ Ganaste ' + (cantidad * 2) + ' MC\n💰 Saldo: ' + d.mikcoins[uid] };
                    } else {
                        r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🎡 *RULETA*\n╰━━━━━━━━━━━━━━━⬣\n\n🔴🔵 Salió: ' + resultado + '\n😢 Perdiste ' + cantidad + ' MC\n💰 Saldo: ' + d.mikcoins[uid] };
                    }
                }
            } else if (cmd === PREFIX + 'dados') {
                const cantidad = parseInt(args[1]);
                const numero = parseInt(args[2]);
                if (!cantidad || cantidad < 10 || !numero || numero < 1 || numero > 6) {
                    r = { text: '🎲 /dados (cantidad) (1-6) - Mín 10 MC' };
                } else if ((d.mikcoins[uid] || 0) < cantidad) {
                    r = { text: '❌ No tienes suficientes MC' };
                } else {
                    d.mikcoins[uid] -= cantidad;
                    const dado = Math.floor(Math.random() * 6) + 1;
                    if (numero === dado) {
                        d.mikcoins[uid] += cantidad * 5;
                        r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🎲 *DADOS*\n╰━━━━━━━━━━━━━━━⬣\n\n🎲 Salió: ' + dado + '\n✅ Ganaste ' + (cantidad * 5) + ' MC\n💰 Saldo: ' + d.mikcoins[uid] };
                    } else {
                        r = { text: '╭━━━━━━━━━━━━━━━⊷\n┃ 🎲 *DADOS*\n╰━━━━━━━━━━━━━━━⬣\n\n🎲 Salió: ' + dado + '\n😢 Perdiste ' + cantidad + ' MC\n💰 Saldo: ' + d.mikcoins[uid] };
                    }
                }
            } else if (cmd === PREFIX + 'rank') {
                const totals = {};
                for (const u of Object.keys(d.mikcoins)) totals[u] = (d.mikcoins[u] || 0) + (d.mikbank[u] || 0);
                for (const u of Object.keys(d.mikbank)) totals[u] = (totals[u] || 0) + (d.mikbank[u] || 0);
                const ranking = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10);
                let texto = '╭━━━━━━━━━━━━━━━⊷\n┃ 🏆 *RANKING*\n╰━━━━━━━━━━━━━━━⬣\n\n';
                if (ranking.length === 0) texto += '❌ No hay datos aún';
                else ranking.forEach(([u, coins], i) => {
                    const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐';
                    texto += medalla + ' @' + u + ': ' + coins + ' MC\n';
                });
                r = { text: texto };
            }

            return r;
        }
    };
};

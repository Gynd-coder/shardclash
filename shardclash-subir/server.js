// =====================================================================
// Shard Clash — servidor para "Pelea con un amigo"
// - Sirve los archivos del juego (index.html, sw.js, art/...)
// - Salas de 2 jugadores por código, por WebSocket en /ws
// - Controla rondas: 15 s para elegir, corazones (5 c/u) y fin de partida
// Uso local:  npm install  &&  npm start   →  http://localhost:3000
// =====================================================================
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PICK_SECONDS = 15;          // tiempo para elegir tropa
const HEARTS = 5;
// Tropas que se pueden elegir (deben coincidir con DRAFT_TYPES del juego)
const TYPES = ["sword", "spear", "archer", "shield", "xbow", "knight", "healer", "mage", "cannon"];
const HEROES = ["pig", "guard", "portal", "waos", "rosa"];
const cleanHero = h => HEROES.includes(h) ? h : "pig";

// ---------------- Archivos estáticos ----------------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4" };
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";
  const file = path.normalize(path.join(ROOT, url));
  // solo archivos del juego, nunca server.js / package.json / fuera de la carpeta
  if (!file.startsWith(ROOT) || /server\.js|package(-lock)?\.json|node_modules/.test(file)) {
    res.writeHead(404); return res.end("No encontrado");
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("No encontrado"); }
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    // Rangos de bytes: necesarios para que el audio pueda empezar a mitad de canción
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (m) {
      const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], data.length - 1) : data.length - 1;
      res.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": end - start + 1 });
      return res.end(data.subarray(start, end + 1));
    }
    res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": data.length });
    res.end(data);
  });
});

// ---------------- Salas ----------------
const rooms = new Map();   // código -> sala
const send = (ws, msg) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const broadcast = (room, msg) => room.players.forEach(p => send(p.ws, msg));
function newCode() {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let c; do { c = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join(""); } while (rooms.has(c));
  return c;
}
const cleanName = n => String(n || "").replace(/[<>&"']/g, "").trim().slice(0, 14) || "Jugador";

function startGame(room) {
  room.hearts = [HEARTS, HEARTS]; room.round = 0;
  broadcast(room, { t: "start", names: room.players.map(p => p.name), heroes: room.players.map(p => p.hero), hearts: room.hearts });
  room.timer = setTimeout(() => nextRound(room), 4500);   // tiempo para la presentación VS
}
function nextRound(room) {
  room.round++; room.picks = [null, null]; room.phase = "draft";
  broadcast(room, { t: "draft", round: room.round, seconds: PICK_SECONDS });
  // margen de 3 s por la latencia; si alguien no eligió, se elige al azar
  room.timer = setTimeout(() => {
    room.picks = room.picks.map(p => p || TYPES[Math.floor(Math.random() * TYPES.length)]);
    resolvePicks(room);
  }, (PICK_SECONDS + 3) * 1000);
}
function resolvePicks(room) {
  clearTimeout(room.timer); room.phase = "battle";
  broadcast(room, { t: "battle", round: room.round, picks: room.picks, seed: Math.floor(Math.random() * 2 ** 31) });
  // si el anfitrión no manda el resultado en 100 s, se decide al azar
  room.timer = setTimeout(() => roundResult(room, Math.random() < .5 ? 0 : 1), 100000);
}
function roundResult(room, winner) {
  if (room.phase !== "battle") return;
  clearTimeout(room.timer); room.phase = "result";
  room.hearts[1 - winner]--;
  broadcast(room, { t: "roundResult", winner, hearts: room.hearts });
  if (room.hearts[1 - winner] <= 0) {
    broadcast(room, { t: "gameover", winner, names: room.players.map(p => p.name) });
    rooms.delete(room.code);
  } else room.timer = setTimeout(() => nextRound(room), 3500);
}

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", ws => {
  let room = null, idx = -1;
  ws.on("message", raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === "create" && !room) {
      room = { code: newCode(), players: [{ ws, name: cleanName(m.name), hero: cleanHero(m.hero) }] }; idx = 0;
      rooms.set(room.code, room);
      send(ws, { t: "room", code: room.code, idx });
    } else if (m.t === "join" && !room) {
      const r = rooms.get(String(m.code || "").toUpperCase().trim());
      if (!r) return send(ws, { t: "error", msg: "No existe una sala con ese código." });
      if (r.players.length >= 2) return send(ws, { t: "error", msg: "La sala ya está llena." });
      room = r; idx = 1; r.players.push({ ws, name: cleanName(m.name), hero: cleanHero(m.hero) });
      send(ws, { t: "room", code: r.code, idx });
      startGame(r);
    } else if (m.t === "pick" && room && room.phase === "draft" && m.round === room.round && TYPES.includes(m.type)) {
      if (!room.picks[idx]) room.picks[idx] = m.type;
      if (room.picks[0] && room.picks[1]) resolvePicks(room);
    } else if (m.t === "in" && room && Array.isArray(m.cmd) && m.cmd.length <= 20) {
      // órdenes del héroe: se reenvían al otro jugador tal cual (cada teléfono simula la misma pelea)
      const other = room.players[1 - idx];
      if (other) send(other.ws, { t: "in", round: m.round, tick: m.tick, cmd: m.cmd });
    } else if (m.t === "result" && room && idx === 0 && m.round === room.round && (m.winner === 0 || m.winner === 1)) {
      roundResult(room, m.winner);   // el anfitrión decide el resultado (ambos ven la misma pelea)
    }
  });
  ws.on("close", () => {
    if (!room) return;
    clearTimeout(room.timer);
    room.players.forEach(p => { if (p.ws !== ws) send(p.ws, { t: "left" }); });
    rooms.delete(room.code);
  });
});

server.listen(PORT, () => console.log(`Shard Clash listo en http://localhost:${PORT}`));

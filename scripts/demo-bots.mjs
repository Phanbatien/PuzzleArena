// Demo bots: seeded players join a tournament and play both rounds, so one person can demo the
// live ranking and the 6-board admin monitor alone. Sudoku only (the bots solve it themselves —
// the server never hands out answers).
//
//   node scripts/demo-bots.mjs <tournamentId> [bots=8] [msPerMove=600]
//
// Start it while the tournament is Open, then drive the stages from the admin screen.
// Needs the dev seed accounts (player1..N) from appsettings.Development.json.

const API = process.env.API_URL ?? "http://localhost:5080";
const PASSWORD = process.env.BOT_PASSWORD ?? "player123";
const [tournamentId, bots = 8, pace = 600] = process.argv.slice(2).map(Number);
if (!tournamentId) throw new Error("usage: node scripts/demo-bots.mjs <tournamentId> [bots] [msPerMove]");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(token, path, body) {
  const res = await fetch(API + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${path} → ${res.status} ${data?.error ?? ""}`);
  return data;
}

function solve(cells) {
  const g = [...cells].map(Number);
  const ok = (i, v) => {
    const r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 27 + Math.floor(c / 3) * 3;
    for (let k = 0; k < 9; k++)
      if (g[r * 9 + k] === v || g[k * 9 + c] === v || g[b + Math.floor(k / 3) * 9 + (k % 3)] === v) return false;
    return true;
  };
  const go = () => {
    const i = g.indexOf(0);
    if (i < 0) return true;
    for (let v = 1; v <= 9; v++) if (ok(i, v)) { g[i] = v; if (go()) return true; }
    g[i] = 0;
    return false;
  };
  go();
  return g;
}

async function playStage(name, token, speed) {
  const attempt = await call(token, `/api/tournaments/${tournamentId}/play`, {});
  if (attempt.status !== "InProgress") return;
  if (attempt.game !== "Sudoku") throw new Error("bots only play Sudoku tournaments");
  const answer = solve(attempt.board.cells);
  const todo = [...attempt.board.cells].flatMap((c, i) => (c === "0" ? [i] : [])).sort(() => Math.random() - 0.5);
  for (const index of todo) {
    await sleep(pace * speed * (0.5 + Math.random()));
    // Now and then a bot slips, so the mistake counter and the 3-strikes rule show up in the demo.
    const value = Math.random() < 0.02 ? (answer[index] % 9) + 1 : answer[index];
    let { attempt: a } = await call(token, `/api/attempts/${attempt.id}/move`, { index, value });
    if (value !== answer[index] && a.status === "InProgress")
      ({ attempt: a } = await call(token, `/api/attempts/${attempt.id}/move`, { index, value: answer[index] }));
    if (a.status !== "InProgress") return console.log(`${name}: ${a.status} in ${(a.durationMs / 1000).toFixed(1)}s`);
  }
}

async function bot(n) {
  const name = `player${n}`;
  const { token } = await call(null, "/api/auth/login", { username: name, password: PASSWORD });
  await call(token, `/api/tournaments/${tournamentId}/register`, {}).catch(() => {});
  const speed = 0.6 + Math.random() * 0.9;
  const played = new Set();
  for (;;) {
    const t = await call(token, `/api/tournaments/${tournamentId}`);
    if (t.status === "Closed") return;
    const mayPlay = t.status === "Qualifier" || (t.status === "Final" && t.isFinalist);
    if (mayPlay && !played.has(t.status)) {
      played.add(t.status);
      console.log(`${name}: playing ${t.status}`);
      await playStage(name, token, speed).catch((e) => console.log(`${name}: ${e.message}`));
    }
    await sleep(1000);
  }
}

await Promise.all(Array.from({ length: bots }, (_, i) => bot(i + 1)));
console.log("Tournament closed. Bots done.");

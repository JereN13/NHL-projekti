const PLAYER_STORAGE_KEY = "playerStatsV3";

let players = [];
let currentView = 0;

const views = ["playersView", "mvpView", "teamView"];
const titles = ["PLAYERS", "MVP LEADERBOARD", "TEAM TOTALS"];

function num(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
}

function loadPlayers() {
    const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
    players = saved ? JSON.parse(saved) : [];
}

/* POINTS */
function getPoints(p) {
    return num(p.goals) + num(p.assists);
}

/* 🔥 DYNAMIC FONT SCALING */
function adjustPlayerTableSize() {
    const table = document.getElementById("playersTableWrapper");
    const count = players.length;

    let size = 22; // default

    if (count > 10) size = 20;
    if (count > 20) size = 18;
    if (count > 30) size = 16;
    if (count > 40) size = 14;
    if (count > 50) size = 12;

    table.style.fontSize = size + "px";
}

/* RENDER PLAYERS */
function renderPlayers() {
    const tbody = document.getElementById("playersTable");
    tbody.innerHTML = "";

    if (!players.length) {
        tbody.innerHTML = "<tr><td colspan='5'>No players available</td></tr>";
        return;
    }

    players
        .sort((a, b) => getPoints(b) - getPoints(a))
        .forEach((p, i) => {
            const tr = document.createElement("tr");

            if (i === 0) tr.classList.add("gold");
            else if (i === 1) tr.classList.add("silver");
            else if (i === 2) tr.classList.add("bronze");

            tr.innerHTML = `
                <td>${p.name}</td>
                <td>${p.team}</td>
                <td>${p.goals}</td>
                <td>${p.assists}</td>
                <td>${getPoints(p)}</td>
            `;
            tbody.appendChild(tr);
        });

    adjustPlayerTableSize(); // 👈 key addition
}

/* MVP */
function renderMVP() {
    const tbody = document.getElementById("mvpTable");

    if (!players.length) {
        tbody.innerHTML = "<tr><td colspan='4'>No data</td></tr>";
        return;
    }

    const sorted = [...players]
        .map(p => ({ ...p, points: getPoints(p) }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);

    tbody.innerHTML = "";

    sorted.forEach((p, i) => {
        const tr = document.createElement("tr");

        if (i === 0) tr.classList.add("gold");
        else if (i === 1) tr.classList.add("silver");
        else if (i === 2) tr.classList.add("bronze");

        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${p.name}</td>
            <td>${p.team}</td>
            <td>${p.points}</td>
        `;
        tbody.appendChild(tr);
    });
}

/* TEAMS */
function renderTeams() {
    const tbody = document.getElementById("teamTable");
    const map = new Map();

    if (!players.length) {
        tbody.innerHTML = "<tr><td colspan='5'>No teams available</td></tr>";
        return;
    }

    players.forEach(p => {
        const t = p.team || "Unassigned";

        if (!map.has(t)) {
            map.set(t, { team: t, players: 0, goals: 0, assists: 0 });
        }

        const team = map.get(t);
        team.players++;
        team.goals += num(p.goals);
        team.assists += num(p.assists);
    });

    const rows = [...map.values()]
        .map(t => ({ ...t, points: t.goals + t.assists }))
        .sort((a, b) => b.points - a.points);

    tbody.innerHTML = "";

    rows.forEach((t, i) => {
        const tr = document.createElement("tr");

        if (i === 0) tr.classList.add("gold");
        else if (i === 1) tr.classList.add("silver");
        else if (i === 2) tr.classList.add("bronze");

        tr.innerHTML = `
            <td>${t.team}</td>
            <td>${t.players}</td>
            <td>${t.goals}</td>
            <td>${t.assists}</td>
            <td>${t.points}</td>
        `;
        tbody.appendChild(tr);
    });
}

/* SWITCH VIEW */
function switchView() {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

    currentView = (currentView + 1) % views.length;

    document.getElementById(views[currentView]).classList.add("active");
    document.getElementById("viewTitle").textContent = titles[currentView];
}

/* TIME */
function updateTimestamp() {
    const now = new Date().toLocaleTimeString();
    document.getElementById("lastUpdate").textContent = `Updated: ${now}`;
}

/* MAIN */
function renderAll() {
    loadPlayers();
    renderPlayers();
    renderMVP();
    renderTeams();
    updateTimestamp();
}

setInterval(renderAll, 2000);
setInterval(switchView, 6000);

renderAll();

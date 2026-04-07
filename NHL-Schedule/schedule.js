const KEY = "nhl_schedule_full_v2";

// Teams
const teams = ["BUF", "COL", "EDM", "CAR", "DAL", "TBL"];

// Full group stage matches with times (21 matches left/right)
const matches = [
    ["13:00", "BUF", "COL"], ["13:00", "CAR", "DAL"],
    ["13:30", "BUF", "EDM"], ["13:30", "CAR", "TBL"],
    ["14:15", "COL", "EDM"], ["14:15", "DAL", "TBL"],
    ["14:45", "COL", "BUF"], ["14:45", "DAL", "CAR"],
    ["15:30", "EDM", "BUF"], ["15:30", "TBL", "CAR"],
    ["16:00", "EDM", "COL"], ["16:00", "TBL", "DAL"],
    ["16:45", "BUF", "CAR"], ["16:45", "COL", "DAL"],
    ["17:15", "EDM", "TBL"], ["17:15", "BUF", "DAL"],
    ["18:00", "COL", "TBL"], ["18:00", "EDM", "CAR"],
    ["18:30", "BUF", "TBL"], ["18:30", "COL", "CAR"],
    ["19:00", "EDM", "DAL"]
];

let data = {};

/* LOAD / SAVE */
function load() {
    const saved = localStorage.getItem(KEY);
    data = saved ? JSON.parse(saved) : {};
}

function save() {
    localStorage.setItem(KEY, JSON.stringify(data));
}

/* POINTS */
function pointsForType(type) {
    if (type === "REG") return 3;
    if (type === "OT") return 2;
    if (type === "SO") return 1;
    return 0;
}

/* TYPE OPTIONS */
function typeOptions(selected = "REG") {
    return `
        <option value="REG" ${selected === "REG" ? "selected" : ""}>REG</option>
        <option value="OT" ${selected === "OT" ? "selected" : ""}>OT</option>
        <option value="SO" ${selected === "SO" ? "selected" : ""}>SO</option>
    `;
}

/* RENDER MATCHES */
function renderMatches() {
    const container = document.getElementById("matches");
    container.innerHTML = "";

    matches.forEach((m, i) => {
        const key = "m" + i;
        const matchData = data[key] || {};
        const type = matchData.type || "REG";

        const div = document.createElement("div");
        div.className = "match";

        div.innerHTML = `
            <span>${m[0]}</span>
            <span>${m[1]}</span>
            <input type="number" min="0" value="${matchData.a ?? ""}" onchange="update('${key}', 'a', this.value)">
            <span>-</span>
            <input type="number" min="0" value="${matchData.b ?? ""}" onchange="update('${key}', 'b', this.value)">
            <span>${m[2]}</span>
            <select onchange="updateType('${key}', this.value)">
                ${typeOptions(type)}
            </select>
        `;

        container.appendChild(div);
    });
}

/* UPDATE SCORE / TYPE */
function update(matchKey, side, value) {
    if (!data[matchKey]) data[matchKey] = { a: "", b: "", type: "REG" };
    data[matchKey][side] = value === "" ? "" : Math.max(0, parseInt(value, 10) || 0);
    save();
    renderAll();
}

function updateType(matchKey, value) {
    if (!data[matchKey]) data[matchKey] = { a: "", b: "", type: "REG" };
    data[matchKey].type = value;
    save();
    renderAll();
}

/* STANDINGS */
function getStandings() {
    const stats = {};
    teams.forEach(t => {
        stats[t] = { pts: 0, gf: 0, ga: 0 };
    });

    matches.forEach((m, i) => {
        const s = data["m" + i];
        if (!s) return;

        const home = m[1];
        const away = m[2];

        const a = parseInt(s.a, 10);
        const b = parseInt(s.b, 10);

        if (Number.isNaN(a) || Number.isNaN(b)) return;

        stats[home].gf += a;
        stats[home].ga += b;
        stats[away].gf += b;
        stats[away].ga += a;

        if (a > b) {
            stats[home].pts += pointsForType(s.type);
        } else if (b > a) {
            stats[away].pts += pointsForType(s.type);
        }
        // If tied, no points are given yet.
    });

    return Object.entries(stats)
        .map(([team, s]) => ({ team, ...s, gd: s.gf - s.ga }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
}

function renderStandings() {
    const tbody = document.getElementById("standings");
    const table = getStandings();
    tbody.innerHTML = "";

    table.forEach((t, i) => {
        const tr = document.createElement("tr");
        if (i < 4) tr.classList.add("top4");
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${t.team}</td>
            <td>${t.pts}</td>
            <td>${t.gf}</td>
            <td>${t.ga}</td>
            <td>${t.gd}</td>
        `;
        tbody.appendChild(tr);
    });
}

/* PLAYOFF LOGIC */
function getWinner(teamA, teamB, scoreA, scoreB) {
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return null;
    if (scoreA === scoreB) return null;
    return scoreA > scoreB ? teamA : teamB;
}

function renderPlayoffs() {
    const table = getStandings();
    if (table.length < 4) return;

    const rs1 = table[0].team;
    const rs2 = table[1].team;
    const rs3 = table[2].team;
    const rs4 = table[3].team;

    document.getElementById("semi1teams").textContent = `${rs1} vs ${rs4}`;
    document.getElementById("semi2teams").textContent = `${rs2} vs ${rs3}`;

    const s1a = parseInt(document.getElementById("semi1a").value, 10);
    const s1b = parseInt(document.getElementById("semi1b").value, 10);
    const s2a = parseInt(document.getElementById("semi2a").value, 10);
    const s2b = parseInt(document.getElementById("semi2b").value, 10);

    const w1 = getWinner(rs1, rs4, s1a, s1b);
    const w2 = getWinner(rs2, rs3, s2a, s2b);

    const l1 = w1 === rs1 ? rs4 : (w1 === rs4 ? rs1 : "");
    const l2 = w2 === rs2 ? rs3 : (w2 === rs3 ? rs2 : "");

    document.getElementById("finalTeams").textContent = (w1 && w2) ? `${w1} vs ${w2}` : "TBD";
    document.getElementById("bronzeTeams").textContent = (l1 && l2) ? `${l1} vs ${l2}` : "TBD";
}

/* INIT PLAYOFF TYPE SELECTS */
function initPlayoffTypes() {
    ["semi1type", "semi2type", "finaltype", "bronzetype"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = typeOptions("REG");
    });
}

/* MAIN RENDER */
function renderAll() {
    renderMatches();
    renderStandings();
    renderPlayoffs();
}

/* INIT */
load();
initPlayoffTypes();
renderAll();

/* Re-render playoff text when inputs are edited */
["semi1a", "semi1b", "semi2a", "semi2b", "finala", "finalb", "bronzea", "bronzeb"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("input", renderPlayoffs);
    }
});

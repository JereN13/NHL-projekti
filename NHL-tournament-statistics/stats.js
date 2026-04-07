const STORAGE_KEY = "playerStatsV3"; 
const TEAM_STORAGE_KEY = "playerTeamsV1";
const TOURNAMENT_KEY = "nhl26_spring_cup_state";
const UNASSIGNED = "Unassigned";
const PLACEHOLDER_TEAMS = ["Team 1", "Team 2", "Team 3", "Team 4"];

let players = [];
let teams = [];
let sortField = "";
let sortAsc = true;

function uid() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
    }
    return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function num(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTeamName(value) {
    return String(value ?? "").trim();
}

function uniqueTeams(list) {
    const set = new Set();
    list.forEach(team => {
        const t = normalizeTeamName(team);
        if (t && !PLACEHOLDER_TEAMS.includes(t)) set.add(t);
    });
    const arr = [...set].filter(team => team !== UNASSIGNED).sort((a, b) => a.localeCompare(b));
    arr.push(UNASSIGNED);
    return arr;
}

function loadTeamsFromBracket() {
    const saved = localStorage.getItem(TOURNAMENT_KEY);
    if (!saved) return [];
    try {
        const data = JSON.parse(saved);
        if (Array.isArray(data.teams)) {
            return data.teams.filter(Boolean).map(normalizeTeamName);
        }
    } catch (e) {
        console.warn("Could not read tournament teams:", e);
    }
    return [];
}

function loadStoredTeams() {
    const saved = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!saved) return [];
    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            return parsed.filter(Boolean).map(normalizeTeamName);
        }
    } catch (e) {
        console.warn("Could not load stored teams:", e);
    }
    return [];
}

function saveTeams() {
    const toSave = teams.filter(team => team && team !== UNASSIGNED);
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(toSave));
}

function ensureTeamExists(teamName) {
    const team = normalizeTeamName(teamName);
    if (!team) return;
    if (!teams.includes(team)) {
        teams = uniqueTeams([...teams, team]);
        saveTeams();
    }
}

function syncTeamsWithPlayers() {
    const merged = uniqueTeams([
        ...loadTeamsFromBracket(),
        ...loadStoredTeams(),
        ...players.map(player => player.team),
        UNASSIGNED
    ]);
    const before = JSON.stringify(teams);
    teams = merged;
    if (JSON.stringify(teams) !== before) saveTeams();
}

function loadPlayers() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            players = parsed.map(p => ({
                id: p.id || uid(),
                name: p.name || "",
                team: normalizeTeamName(p.team) || UNASSIGNED,
                goals: num(p.goals),
                assists: num(p.assists)
            }));
        }
    } catch (e) {
        console.warn("Could not load players:", e);
    }
}

function savePlayers() {
    const compact = players.map(player => ({
        id: player.id,
        name: player.name,
        team: normalizeTeamName(player.team) || UNASSIGNED,
        goals: num(player.goals),
        assists: num(player.assists)
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
}

function getPlayerPoints(player) {
    return num(player.goals) + num(player.assists);
}

function getElement(id) {
    return document.getElementById(id);
}

function addPlayer() {
    const name = getElement("name").value.trim();
    const team = normalizeTeamName(getElement("team").value) || UNASSIGNED;
    if (!name) return;
    ensureTeamExists(team);
    players.push({
        id: uid(),
        name,
        team,
        goals: num(getElement("goals").value),
        assists: num(getElement("assists").value)
    });
    getElement("name").value = "";
    getElement("goals").value = "";
    getElement("assists").value = "";
    savePlayers();
    render();
    getElement("name").focus();
}

function editPlayer(id, field, value) {
    const player = players.find(p => p.id === id);
    if (!player) return;
    const trimmed = String(value ?? "").trim();
    if (field === "goals" || field === "assists") player[field] = num(trimmed);
    else if (field === "team") {
        player.team = trimmed || UNASSIGNED;
        ensureTeamExists(player.team);
    } else player[field] = trimmed;
    savePlayers();
    render();
}

function sortBy(field) {
    if (sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = true; }
    render();
}

function getFilteredPlayers() {
    const search = getElement("search").value.toLowerCase().trim();
    const teamFilter = (getElement("teamFilter").value || "").toLowerCase().trim();
    return players.filter(player => {
        const name = (player.name || "").toLowerCase();
        const team = (player.team || UNASSIGNED).toLowerCase();
        const matchesSearch = name.includes(search) || team.includes(search);
        const matchesTeam = !teamFilter || team === teamFilter;
        return matchesSearch && matchesTeam;
    });
}

function sortPlayers(list) {
    const sorted = [...list];
    sorted.sort((a, b) => {
        let av = a[sortField];
        let bv = b[sortField];
        if (sortField === "points") {
            av = getPlayerPoints(a);
            bv = getPlayerPoints(b);
        }
        if (typeof av === "string") {
            av = av.toLowerCase(); bv = String(bv).toLowerCase();
            if (av < bv) return sortAsc ? -1 : 1;
            if (av > bv) return sortAsc ? 1 : -1;
            return 0;
        }
        if (av < bv) return sortAsc ? -1 : 1;
        if (av > bv) return sortAsc ? 1 : -1;
        return 0;
    });
    return sorted;
}

function populateTeamSelects() {
    const teamSelect = getElement("team");
    const filterSelect = getElement("teamFilter");
    const currentTeam = teamSelect.value || "";
    const currentFilter = filterSelect.value || "";
    teamSelect.innerHTML = "";
    filterSelect.innerHTML = '<option value="">All Teams</option>';
    teams.forEach(team => {
        if (!team) return;
        teamSelect.add(new Option(team, team));
        filterSelect.add(new Option(team, team));
    });
    teamSelect.value = teams.includes(currentTeam) ? currentTeam : teams[0] || UNASSIGNED;
    filterSelect.value = teams.includes(currentFilter) ? currentFilter : "";
}

function addTeam() {
    const input = getElement("newTeamName");
    const teamName = normalizeTeamName(input.value);
    if (!teamName || teamName === UNASSIGNED) { input.value = ""; return; }
    ensureTeamExists(teamName);
    input.value = "";
    render();
}

function removeTeam(teamName) {
    const team = normalizeTeamName(teamName);
    if (!team || team === UNASSIGNED) return;

    // Remove from teams array
    teams = teams.filter(t => t !== team);

    // Remove from players
    players.forEach(player => {
        if (player.team === team) player.team = UNASSIGNED;
    });

    // Remove from stored teams
    saveTeams();
    savePlayers();

    // Also remove from bracket teams if present
    const bracketDataRaw = localStorage.getItem(TOURNAMENT_KEY);
    if (bracketDataRaw) {
        try {
            const bracketData = JSON.parse(bracketDataRaw);
            if (Array.isArray(bracketData.teams)) {
                bracketData.teams = bracketData.teams.filter(t => normalizeTeamName(t) !== team);
                localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(bracketData));
            }
        } catch (e) {
            console.warn("Failed to update bracket data:", e);
        }
    }

    render(); // Refresh everything
}

function renderTeamManager() {
    const container = getElement("teamList");
    const counts = new Map();
    players.forEach(player => {
        const team = normalizeTeamName(player.team) || UNASSIGNED;
        counts.set(team, (counts.get(team) || 0) + 1);
    });
    const visibleTeams = teams.filter(team => team !== UNASSIGNED);
    container.innerHTML = "";
    if (visibleTeams.length === 0) {
        container.innerHTML = `<div class="team-chip"><span>No teams yet</span></div>`;
        return;
    }
    visibleTeams.forEach(team => {
        const count = counts.get(team) || 0;
        const chip = document.createElement("div");
        chip.className = "team-chip";
        chip.innerHTML = `
            <span>${team}</span>
            <span class="count">${count} player${count === 1 ? "" : "s"}</span>
            <button type="button" onclick="removeTeam('${team.replace(/'/g, "\\'")}')">Remove</button>
        `;
        container.appendChild(chip);
    });
}

function renderPlayersTable() {
    const tbody = document.querySelector("#statsTable tbody");
    const filtered = sortField ? sortPlayers(getFilteredPlayers()) : getFilteredPlayers();
    tbody.innerHTML = "";
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">No players yet</td></tr>`;
        return;
    }
    filtered.forEach(player => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input value="${player.name}" id="name-${player.id}" disabled></td>
            <td><input value="${player.team}" id="team-${player.id}" disabled></td>
            <td><input type="number" value="${player.goals}" id="goals-${player.id}" disabled></td>
            <td><input type="number" value="${player.assists}" id="assists-${player.id}" disabled></td>
            <td>${getPlayerPoints(player)}</td>
            <td>
                <button onclick="enableEdit('${player.id}')">Edit</button>
                <button onclick="saveEdit('${player.id}')">Save</button>
                <button onclick="deletePlayer('${player.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMvpLeaderboard() {
    const tbody = document.querySelector("#mvpTable tbody");
    const leaderboard = [...players].map(player => ({ ...player, points: getPlayerPoints(player) }))
        .sort((a, b) => b.points - a.points || b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name))
        .slice(0, 10);
    tbody.innerHTML = "";
    leaderboard.forEach((player, index) => {
        const tr = document.createElement("tr");
        if (index === 0) tr.style.backgroundColor = "#ffd700";
        else if (index === 1) tr.style.backgroundColor = "#c0c0c0";
        else if (index === 2) tr.style.backgroundColor = "#cd7f32";
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.team || "-"}</td>
            <td>${player.goals}</td>
            <td>${player.assists}</td>
            <td>${player.points}</td>
        `;
        tbody.appendChild(tr);
    });
    if (leaderboard.length === 0) tbody.innerHTML = `<tr><td colspan="6">No players yet</td></tr>`;
}

function renderTeamTotals() {
    const tbody = document.querySelector("#teamTotalsTable tbody");
    const totals = new Map();
    players.forEach(player => {
        const team = normalizeTeamName(player.team) || UNASSIGNED;
        if (!totals.has(team)) totals.set(team, { team, players: 0, goals: 0, assists: 0 });
        const row = totals.get(team);
        row.players += 1;
        row.goals += num(player.goals);
        row.assists += num(player.assists);
    });
    const rows = [...totals.values()].map(row => ({ ...row, points: row.goals + row.assists }))
        .sort((a, b) => b.points - a.points || b.goals - a.goals || a.team.localeCompare(b.team));
    tbody.innerHTML = "";
    rows.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row.team}</td><td>${row.players}</td><td>${row.goals}</td><td>${row.assists}</td><td>${row.points}</td>`;
        tbody.appendChild(tr);
    });
    if (rows.length === 0) tbody.innerHTML = `<tr><td colspan="5">No team stats yet</td></tr>`;
}

function render() {
    syncTeamsWithPlayers();
    populateTeamSelects();
    renderTeamManager();
    renderPlayersTable();
    renderMvpLeaderboard();
    renderTeamTotals();
}

function resetStats() {
    localStorage.removeItem(STORAGE_KEY);
    players = [];
    sortField = "";
    sortAsc = true;
    render();
}

function enableEdit(id) {
    ["name", "team", "goals", "assists"].forEach(field => {
        const el = document.getElementById(`${field}-${id}`);
        if (el) el.disabled = false;
    });
}

function saveEdit(id) {
    const player = players.find(p => p.id === id);
    if (!player) return;
    player.name = document.getElementById(`name-${id}`).value.trim();
    player.team = normalizeTeamName(document.getElementById(`team-${id}`).value) || UNASSIGNED;
    player.goals = num(document.getElementById(`goals-${id}`).value);
    player.assists = num(document.getElementById(`assists-${id}`).value);
    ensureTeamExists(player.team);
    savePlayers();
    render();
}

function deletePlayer(id) {
    players = players.filter(p => p.id !== id);
    savePlayers();
    render();
}

function init() {
    loadPlayers();
    teams = uniqueTeams([...loadTeamsFromBracket(), ...loadStoredTeams(), ...players.map(p => p.team), UNASSIGNED]);
    saveTeams();
    render();
    window.addEventListener("storage", () => {
        loadPlayers();
        teams = uniqueTeams([...loadTeamsFromBracket(), ...loadStoredTeams(), ...players.map(p => p.team), UNASSIGNED]);
        render();
    });
    const teamInput = getElement("newTeamName");
    if (teamInput) {
        teamInput.addEventListener("keydown", event => {
            if (event.key === "Enter") { event.preventDefault(); addTeam(); }
        });
    }
}

init();

const STORAGE_KEY = "nhl26_spring_cup_state";

let state = {
    teams: ["Team 1", "Team 2", "Team 3", "Team 4"],
    finalists: ["", ""],
    semifinalLosers: ["", ""],
    champion: "",
    silver: "",
    bronze: "",
    fourthPlace: "",
    scores: {
        semiLeft: "",
        semiRight: "",
        final: "",
        bronze: ""
    }
};

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.teams) && Array.isArray(parsed.finalists)) {
            state = {
                teams: [
                    parsed.teams[0] ?? "Team 1",
                    parsed.teams[1] ?? "Team 2",
                    parsed.teams[2] ?? "Team 3",
                    parsed.teams[3] ?? "Team 4"
                ],
                finalists: [
                    parsed.finalists[0] ?? "",
                    parsed.finalists[1] ?? ""
                ],
                semifinalLosers: [
                    parsed.semifinalLosers?.[0] ?? "",
                    parsed.semifinalLosers?.[1] ?? ""
                ],
                champion: parsed.champion ?? "",
                silver: parsed.silver ?? parsed.loser ?? "",
                bronze: parsed.bronze ?? "",
                fourthPlace: parsed.fourthPlace ?? "",
                scores: {
                    semiLeft: parsed.scores?.semiLeft ?? "",
                    semiRight: parsed.scores?.semiRight ?? "",
                    final: parsed.scores?.final ?? "",
                    bronze: parsed.scores?.bronze ?? ""
                }
            };
        }
    } catch (err) {
        console.warn("Could not load saved tournament state:", err);
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        loser: state.silver
    }));
}

function getEl(id) {
    return document.getElementById(id);
}

function setInputValue(id, value) {
    const el = getEl(id);
    if (el && el.value !== value) {
        el.value = value;
    }
}

function render() {
    setInputValue("team1", state.teams[0]);
    setInputValue("team2", state.teams[1]);
    setInputValue("team3", state.teams[2]);
    setInputValue("team4", state.teams[3]);

    getEl("final1").textContent = state.finalists[0] || "-";
    getEl("final2").textContent = state.finalists[1] || "-";
    getEl("bronze1").textContent = state.semifinalLosers[0] || "-";
    getEl("bronze2").textContent = state.semifinalLosers[1] || "-";

    getEl("champion").textContent = state.champion || "-";
    getEl("silver").textContent = state.silver || "-";
    getEl("bronze").textContent = state.bronze || "-";
    getEl("fourthPlace").textContent = state.fourthPlace || "-";

    getEl("semiLeftScore").value = state.scores.semiLeft;
    getEl("semiRightScore").value = state.scores.semiRight;
    getEl("finalScoreMain").value = state.scores.final;
    getEl("finalScore").value = state.scores.final;
    getEl("bronzeScore").value = state.scores.bronze;

    requestAnimationFrame(updateLines);
}

function updateTeams() {
    state.teams[0] = getEl("team1").value.trim();
    state.teams[1] = getEl("team2").value.trim();
    state.teams[2] = getEl("team3").value.trim();
    state.teams[3] = getEl("team4").value.trim();

    saveState();
    render();
}

function saveScores() {
    state.scores.semiLeft = getEl("semiLeftScore").value.trim();
    state.scores.semiRight = getEl("semiRightScore").value.trim();
    state.scores.final = getEl("finalScoreMain").value.trim() || getEl("finalScore").value.trim();
    state.scores.bronze = getEl("bronzeScore").value.trim();

    saveState();
}

function advanceSide(side) {
    if (side === "left") {
        const a = state.teams[0];
        const b = state.teams[1];
        if (!a || !b) return;

        const winner = prompt(`Winner?\n1: ${a}\n2: ${b}`);
        if (winner === "1") {
            state.finalists[0] = a;
            state.semifinalLosers[0] = b;
        }
        if (winner === "2") {
            state.finalists[0] = b;
            state.semifinalLosers[0] = a;
        }
    }

    if (side === "right") {
        const a = state.teams[2];
        const b = state.teams[3];
        if (!a || !b) return;

        const winner = prompt(`Winner?\n1: ${a}\n2: ${b}`);
        if (winner === "1") {
            state.finalists[1] = a;
            state.semifinalLosers[1] = b;
        }
        if (winner === "2") {
            state.finalists[1] = b;
            state.semifinalLosers[1] = a;
        }
    }

    state.champion = "";
    state.silver = "";
    state.bronze = "";
    state.fourthPlace = "";

    saveState();
    render();
}

function selectChampion(index) {
    state.champion = state.finalists[index];
    state.silver = state.finalists[index === 0 ? 1 : 0];

    saveState();
    render();
}

function selectBronze(index) {
    state.bronze = state.semifinalLosers[index];
    state.fourthPlace = state.semifinalLosers[index === 0 ? 1 : 0];

    saveState();
    render();
}

function resetTournament() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}

function clearLines(svg) {
    while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
    }
}

function makeSvgPath(d, className = "connector-line") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", className);
    return path;
}

function leftMid(rect) {
    return {
        x: rect.left,
        y: rect.top + rect.height / 2
    };
}

function rightMid(rect) {
    return {
        x: rect.right,
        y: rect.top + rect.height / 2
    };
}

function connectPairToBox(svg, leftSource, rightSource, targetBox, className = "connector-line") {
    const s1 = rightMid(leftSource);
    const s2 = leftMid(rightSource);

    const joinX = (s1.x + s2.x) / 2;
    const targetLeft = leftMid(targetBox);
    const targetRight = rightMid(targetBox);

    const path1 = `M ${s1.x} ${s1.y} H ${joinX} V ${targetLeft.y} H ${targetLeft.x}`;
    const path2 = `M ${s2.x} ${s2.y} H ${joinX} V ${targetRight.y} H ${targetRight.x}`;

    svg.appendChild(makeSvgPath(path1, className));
    svg.appendChild(makeSvgPath(path2, className));
}

function updateLines() {
    const svg = getEl("lines");
    const area = getEl("tournamentArea");

    if (!svg || !area) return;

    clearLines(svg);

    const areaRect = area.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${areaRect.width} ${areaRect.height}`);
    svg.setAttribute("width", areaRect.width);
    svg.setAttribute("height", areaRect.height);

    const team1 = getEl("team1").getBoundingClientRect();
    const team2 = getEl("team2").getBoundingClientRect();
    const team3 = getEl("team3").getBoundingClientRect();
    const team4 = getEl("team4").getBoundingClientRect();

    const final1 = getEl("final1").getBoundingClientRect();
    const final2 = getEl("final2").getBoundingClientRect();

    const champion = getEl("champion").getBoundingClientRect();
    const silver = getEl("silver").getBoundingClientRect();

    const bronze1 = getEl("bronze1").getBoundingClientRect();
    const bronze2 = getEl("bronze2").getBoundingClientRect();

    const offset = {
        x: areaRect.left,
        y: areaRect.top
    };

    const rel = (rect) => ({
        left: rect.left - offset.x,
        right: rect.right - offset.x,
        top: rect.top - offset.y,
        bottom: rect.bottom - offset.y,
        width: rect.width,
        height: rect.height
    });

    connectPairToBox(svg, rel(team1), rel(team2), rel(final1), "connector-line");
    connectPairToBox(svg, rel(team3), rel(team4), rel(final2), "connector-line");

    connectPairToBox(svg, rel(final1), rel(final2), rel(champion), "connector-line");
    connectPairToBox(svg, rel(final1), rel(final2), rel(silver), "connector-line");

    connectPairToBox(svg, rel(team1), rel(team2), rel(bronze1), "connector-line bronze-line");
    connectPairToBox(svg, rel(team3), rel(team4), rel(bronze2), "connector-line bronze-line");
}

function initEvents() {
    ["team1", "team2", "team3", "team4"].forEach((id) => {
        getEl(id).addEventListener("input", updateTeams);
    });

    ["semiLeftScore", "semiRightScore", "finalScoreMain", "finalScore", "bronzeScore"].forEach((id) => {
        const el = getEl(id);
        if (el) el.addEventListener("input", saveScores);
    });

    window.addEventListener("resize", () => {
        requestAnimationFrame(updateLines);
    });

    window.addEventListener("load", () => {
        requestAnimationFrame(updateLines);
    });
}

loadState();
initEvents();
render();

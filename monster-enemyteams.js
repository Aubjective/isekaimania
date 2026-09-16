// EnemyTeams integration for Monster detail pages.
// Source schema (compressed): [teamId, teamKey, [[slot, monsterKey, level, skill, specialSkill, rNormal], ...]]
wiki.enemyTeams = [];
wiki.enemyTeamLocalisation = new Map();
wiki.enemyTeamsReady = false;

async function loadGzipJson(path, fallback) {
    try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) return fallback;
        const bytes = await response.arrayBuffer();
        const view = new Uint8Array(bytes);
        if (view.length >= 2 && view[0] === 0x1f && view[1] === 0x8b) {
            if (!('DecompressionStream' in window)) {
                console.warn(`Cannot read ${path}: gzip decompression is not supported by this browser.`);
                return fallback;
            }
            const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
            return JSON.parse(await new Response(stream).text());
        }
        return JSON.parse(new TextDecoder().decode(view));
    } catch (error) {
        console.warn(`Could not load ${path}`, error);
        return fallback;
    }
}

function enemyTeamText(key) {
    const row = wiki.enemyTeamLocalisation.get(key) || {};
    return row[wiki.locale] || row.en || key;
}

function monsterByKey(key) {
    return wiki.monsters.find(monster => monster.MonsterKey === key);
}

function enemySkillReference(monsterKey, value) {
    if (value === null || value === undefined || value === '') return '';
    const numeric = typeof value === 'number' || /^-?\d+$/.test(String(value).trim());
    if (!numeric) return futureReferenceLink('skill', String(value).trim());

    const index = Number(value);
    if (index === -1) return escapeHtml(ui('noDefaultSkill', 'No default skill'));
    if (index === 0) return escapeHtml(ui('randomActiveSkill', 'Random Active Skill'));

    const monster = monsterByKey(monsterKey);
    const skillKey = monster && Array.isArray(monster.ActiveSkillKeys) ? monster.ActiveSkillKeys[index - 1] : null;
    if (skillKey) return futureReferenceLink('skill', skillKey);
    return `${escapeHtml(ui('activeSkill', 'Active Skill'))} ${escapeHtml(index)}`;
}

function enemySlotOverrides(enemy) {
    const monsterKey = enemy[1];
    const skill = enemy[3];
    const specialSkill = enemy[4];
    const rNormal = enemy[5];
    const notes = [];

    // Positive numeric Skill values are the ordinary Active Skill slot mapping and stay hidden.
    // Show only exceptional default behavior: -1, random (0), or a written skill key.
    if (skill !== null && skill !== undefined && skill !== '') {
        const numeric = typeof skill === 'number' || /^-?\d+$/.test(String(skill).trim());
        const number = numeric ? Number(skill) : null;
        if (!numeric || number <= 0) {
            notes.push(`<span><strong>${escapeHtml(ui('defaultSkill', 'Default Skill'))}:</strong> ${enemySkillReference(monsterKey, skill)}</span>`);
        }
    }

    if (specialSkill !== null && specialSkill !== undefined && specialSkill !== '') {
        notes.push(`<span><strong>${escapeHtml(ui('specialSkill', 'Special Skill'))}:</strong> ${enemySkillReference(monsterKey, specialSkill)}</span>`);
    }

    if (rNormal !== null && rNormal !== undefined && rNormal !== '') {
        notes.push(`<span><strong>${escapeHtml(ui('normalAttackReplacement', 'Normal Attack Replacement'))}:</strong> ${enemySkillReference(monsterKey, rNormal)}</span>`);
    }

    return notes.length ? `<div class="enemy-slot-overrides">${notes.join('')}</div>` : '';
}

function enemyMonsterLink(key) {
    const name = monsterText(key);
    const exists = wiki.monsters.some(monster => monster.MonsterKey === key);
    if (!exists) return `<span>${escapeHtml(name)}</span>`;
    return `<span class="link enemy-team-monster-link" data-monster-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadMonsterDetail(this.dataset.monsterKey)">${escapeHtml(name)}</span>`;
}

function renderEnemyTeam(team) {
    const teamId = team[0];
    const teamKey = team[1];
    const enemies = Array.isArray(team[2]) ? team[2] : [];
    const slots = enemies.map(enemy => {
        const slot = enemy[0];
        const monsterKey = enemy[1];
        const level = enemy[2];
        const levelText = level !== null && level !== undefined && level !== '' ? `<span class="enemy-team-level">${escapeHtml(level)}</span>` : '';
        return `<div class="enemy-team-slot"><div class="enemy-team-slot-main"><span class="enemy-team-slot-number">${escapeHtml(ui('slot', 'Slot'))} ${escapeHtml(slot)}</span>${enemyMonsterLink(monsterKey)}${levelText}</div>${enemySlotOverrides(enemy)}</div>`;
    }).join('');

    return `<div class="enemy-team-card" data-team-id="${escapeHtml(teamId)}" data-team-key="${escapeHtml(teamKey)}"><div class="enemy-team-title"><span class="link future-reference enemy-team-link" data-reference-type="enemy-team" data-reference-key="${escapeHtml(teamKey)}" title="${escapeHtml(ui('enemyTeamComingSoon', 'Enemy Team detail pages can be connected later.'))}" onclick="event.stopPropagation()">${escapeHtml(enemyTeamText(teamKey))}</span></div><div class="enemy-team-slots">${slots}</div></div>`;
}

function renderMonsterEnemyTeams(monsterKey) {
    if (!wiki.enemyTeamsReady) return '';
    const teams = wiki.enemyTeams.filter(team => Array.isArray(team[2]) && team[2].some(enemy => enemy[1] === monsterKey));
    if (!teams.length) return '';
    return `<div class="card detail-section monster-enemy-teams"><h2>${escapeHtml(ui('enemyTeams', 'Enemy Teams'))}</h2><p class="enemy-team-note">${escapeHtml(ui('enemyTeamsNote', 'Possible enemy teams where this monster can appear. Encounter-specific skill behavior is shown only when it overrides the ordinary numbered Active Skill selection.'))}</p><div class="enemy-team-grid">${teams.map(renderEnemyTeam).join('')}</div></div>`;
}

const baseLoadMonsterDetailForEnemyTeams = loadMonsterDetail;
loadMonsterDetail = function (key, fromRoute = false) {
    const result = baseLoadMonsterDetailForEnemyTeams(key, fromRoute);
    if (!wiki.enemyTeamsReady) return result;

    const route = monsterRouteInfo();
    if (route.section !== 'monsters' || route.key !== key) return result;
    const stack = document.querySelector('.detail-stack');
    if (!stack || stack.querySelector('.monster-enemy-teams')) return result;

    const section = renderMonsterEnemyTeams(key);
    if (section) stack.insertAdjacentHTML('beforeend', section);
    return result;
};

const enemyTeamsDataPromise = (async () => {
    const [teams, localisation] = await Promise.all([
        loadGzipJson('data/enemyteams.json.gz', []),
        loadGzipJson('data/enemyteams_localisation.json.gz', {})
    ]);
    wiki.enemyTeams = Array.isArray(teams) ? teams : [];
    Object.entries(localisation || {}).forEach(([key, value]) => wiki.enemyTeamLocalisation.set(key, value));
    wiki.enemyTeamsReady = true;

    if (wiki.ready && monsterRouteInfo().section === 'monsters' && monsterRouteInfo().key) handleHashRoute();
})();

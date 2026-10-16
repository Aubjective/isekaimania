// Mission wiki: one mission per grade quest, using the same detail presentation as Special Events.
wiki.missionGroups = [];
wiki.missionLocalisation = {};
wiki.missionsReady = false;
const missionPreviousRoute = handleHashRoute;
const missionPreviousView = loadView;
window.removeEventListener('hashchange', missionPreviousRoute);

function missionText(key) {
    const row = wiki.missionLocalisation[key] || {};
    return row[wiki.locale] || row.en || '';
}
function missionObjective(group) {
    const quest = group.quest || {};
    const o = (group.stages || [])[0]?.objective || {};
    const format = (key, args) => {
        const template = missionText(key);
        if (!template) return '';
        const values = Array.isArray(args) ? args : String(args || '').split('-');
        const areaTokens = ['EnteredTileArea', 'DefeatAreaMonster', 'DefeatRareEncounterMonster'];
        const countKeys = ['HaveItem', 'HaveEquipment', 'DefeatMonster', 'DefeatAreaMonster', 'DefeatTeam'];
        return template.replace(/\{(\d+)\}/g, (match, number) => {
            const i = Number(number), value = values[i];
            if (value === undefined || value === null) return match;
            if (areaTokens.includes(key) && i === 0 && /^\d+$/.test(value))
                return typeof tileAreaById === 'function' && tileAreaById(value)
                    ? '<a href="' + routeHash('tileareas',value) + '">' + escapeHtml(value) + '</a>' : escapeHtml(value);
            if (countKeys.includes(key) && i === (key === 'DefeatAreaMonster' ? 1 : 0) && (value === '0' || value === '1'))
                return '';
            return specialEventReference(value) || (/^[\w ]+$/.test(value) ? escapeHtml(value) : match);
        }).replace(/ {2,}/g,' ').replace(/\s+([.,!?])/g,'$1');
    };
    if (o.descriptionKey) {
        const description = format(o.descriptionKey, o.descriptionVariables);
        if (description && !/\{\d+\}/.test(description)) return description;
    }
    const requirements = (o.conditionTokens || []).map(token => {
        const parts = token.split('-'), action = parts.shift();
        // Source condition order is entity then amount. Localization templates use amount then entity.
        if (['HaveItem','HaveEquipment','DefeatMonster','DefeatTeam'].includes(action))
            return format(action, [parts[1],parts[0]]);
        if (action === 'DefeatAreaMonster') return format(action, [parts[0],parts[1]]);
        return format(action, parts);
    }).filter(value => value && !/\{\d+\}/.test(value));
    return [...new Set(requirements)].join(' · ');
}
function missionDetail(group) {
    const stage = (group.stages || [])[0] || {};
    const locations = [], targets = [];
    const tiles = stage.locationRefs?.tileData || [];
    const areas = stage.locationRefs?.tileArea || [];
    for (const tile of tiles) {
        const display = specialEventReference(tile);
        if (display && !locations.includes(display)) locations.push(display);
    }
    for (const area of areas) {
        const display = specialEventAreaReference(area);
        if (display && !locations.includes(display)) locations.push(display);
    }
    for (const target of stage.targetRefs || []) {
        const display = specialEventReference(target);
        if (display && !targets.includes(display)) targets.push(display);
    }
    const objective = missionObjective(group);
    const grade = String(group.grade || '').replace(/Grade$/, '');
    const rows = [infoRow(ui('grade','Grade'), escapeHtml(grade + ' Grade'))];
    if (locations.length) rows.push(infoRow(ui('locations','Locations'),locations.join(' · ')));
    if (targets.length) rows.push(infoRow(ui('npc','NPC') + ' / ' + ui('target','Target'),targets.join(' · ')));
    if (objective) rows.push(infoRow(ui('objective','Objective'),objective));
    return '<section class="card detail-section">' + rows.join('') + '</section>';
}
function renderMissionList() {
    const rows = wiki.missionGroups.map(group => {
        const name = missionText(group.key) || missionText(group.quest?.key) || group.key.replace(/([a-z])([A-Z])/g,'$1 $2');
        const grade = String(group.grade || '').replace(/Grade$/,'');
        return '<article class="card entity-list-card main-quest-list-card" data-grade="'+escapeHtml(grade)+'" data-search="'+escapeHtml(name.toLowerCase())+'" onclick="loadMissionDetail(this.dataset.key)" data-key="'+escapeHtml(group.key)+'"><h3>'+escapeHtml(name)+'</h3><p>'+escapeHtml(ui('grade','Grade'))+': '+escapeHtml(grade)+'</p></article>';
    }).join('');
    return '<div class="header-card"><h1>'+escapeHtml(ui('missions','Missions'))+'</h1><p>'+wiki.missionGroups.length+' '+escapeHtml(ui('entries','entries'))+'</p><select id="missionGradeFilter" aria-label="Grade"><option value="">All Grades</option><option value="E">E Grade</option><option value="D">D Grade</option><option value="C">C Grade</option></select></div><div class="grid" id="missionGrid">'+rows+'</div>';
}
function missionFilter() {
    const grade = document.getElementById('missionGradeFilter')?.value || '';
    document.querySelectorAll('#missionGrid [data-grade]').forEach(card => { card.style.display = grade && card.dataset.grade !== grade ? 'none' : ''; });
}
function loadMissionDetail(key,fromRoute=false) {
    const group = wiki.missionGroups.find(g => g.key === key);
    if (!group) return;
    if (!fromRoute && navigateHash('missions',key)) return;
    setActiveView('Missions');
    const name = missionText(group.key) || missionText(group.quest?.key) || group.key;
    document.getElementById('content').innerHTML =
        '<button class="back-btn" onclick="loadView(\'Missions\')">← '+escapeHtml(ui('back','Back'))+'</button><div class="detail-stack"><div class="card detail-title-card main-quest-title-card"><h2>'+escapeHtml(name)+'</h2></div>'+missionDetail(group)+'</div>';
    window.scrollTo(0,0);
}
function missionRoute() {
    const parts = window.location.hash.replace(/^#\/?/,'').split('/');
    if (parts[0].toLowerCase() !== 'missions') return false;
    setActiveView('Missions');
    if (!wiki.missionsReady) {
        document.getElementById('content').innerHTML = '<h2>'+escapeHtml(ui('loading','Loading...'))+'</h2>';
        return true;
    }
    if (parts[1]) loadMissionDetail(decodeURIComponent(parts[1]),true);
    else loadView('Missions',true);
    return true;
}
handleHashRoute = function(){if (!wiki.ready) return; if (missionRoute()) return; missionPreviousRoute();};
loadView = function(view,fromRoute=false) {
    if (view !== 'Missions') return missionPreviousView(view,fromRoute);
    if (!fromRoute && navigateHash('missions')) return;
    setActiveView('Missions');
    document.getElementById('content').innerHTML = wiki.missionsReady ? renderMissionList() : '<h2>'+escapeHtml(ui('loading','Loading...'))+'</h2>';
    document.getElementById('missionGradeFilter')?.addEventListener('change',missionFilter);
    window.scrollTo(0,0);
};
window.addEventListener('hashchange',handleHashRoute);
const missionPromise = (async()=>{
    const [data,localisation] = await Promise.all([
        loadJson('data/mission-stages.json',{groups:[]}),
        loadJson('data/mission-localisation.json',{})
    ]);
    wiki.missionGroups = data.groups || [];
    wiki.missionLocalisation = localisation;
    await Promise.allSettled([typeof specialEventPromise !== 'undefined' ? specialEventPromise : Promise.resolve()]);
    wiki.missionsReady = true;
    if (wiki.ready && window.location.hash.toLowerCase().startsWith('#/missions')) handleHashRoute();
})();

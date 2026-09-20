// Passive Skill wiki module. PassiveSkillKey is the stable route/reference key; localisation controls display text.
// Character Traits are sourced from the same PassiveSkills table (Type = Trait).
wiki.passiveSkills = [];
wiki.passiveSkillLocalisation = new Map();
wiki.passiveSkillsReady = false;

const baseHandleHashRouteForPassiveSkills = handleHashRoute;
const baseLoadViewForPassiveSkills = loadView;
const baseSkillLinkForPassiveSkills = skillLink;
const baseTraitLinkForPassiveSkills = traitLink;
window.removeEventListener('hashchange', baseHandleHashRouteForPassiveSkills);

function passiveSkillLocaleRow(key) {
    return wiki.passiveSkillLocalisation.get(key) || {};
}

function passiveSkillText(key) {
    const row = passiveSkillLocaleRow(key).Name || {};
    return row[wiki.locale] || row.en || key;
}

function passiveSkillByKey(key) {
    return wiki.passiveSkills.find(skill => skill.PassiveSkillKey === key);
}

function passiveSkillReferenceLink(key) {
    if (!key) return '';
    const skill = passiveSkillByKey(key);
    if (!skill) return baseSkillLinkForPassiveSkills(key);
    return `<span class="link passive-skill-link" data-passive-skill-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadPassiveSkillDetail(this.dataset.passiveSkillKey)">${escapeHtml(passiveSkillText(key))}</span>`;
}

skillLink = function (key) {
    if (passiveSkillByKey(key)) return passiveSkillReferenceLink(key);
    return baseSkillLinkForPassiveSkills(key);
};

traitLink = function (key) {
    const skill = passiveSkillByKey(key);
    if (skill && skill.Type === 'Trait') return passiveSkillReferenceLink(key);
    return baseTraitLinkForPassiveSkills(key);
};

const baseFutureReferenceLinkForPassiveSkills = futureReferenceLink;
futureReferenceLink = function (type, key) {
    if (type === 'skill' && passiveSkillByKey(key)) return passiveSkillReferenceLink(key);
    return baseFutureReferenceLinkForPassiveSkills(type, key);
};

function renderPassiveSkillImage(skill, name, detail = false) {
    const sprite = skill.Sprite || skill.PassiveSkillKey;
    const sizeClass = detail ? 'entity-image-detail' : 'entity-image-list';
    const loading = detail ? 'eager' : 'lazy';
    return `<div class="entity-image-slot ${sizeClass}"><img src="passiveskillsprite/${encodeURIComponent(sprite)}.png" alt="${escapeHtml(name)}" loading="${loading}" decoding="async" onerror="this.style.display='none'"></div>`;
}

function renderPassiveSkillUnit(unit, index) {
    if (!unit || !unit.Action) return '';
    const values = [
        typeof skillUnitActionText === 'function' ? skillUnitActionText(unit.Action) : readableSkillValue(unit.Action),
        typeof skillTokenText === 'function' ? skillTokenText(unit.Value) : readableSkillValue(unit.Value),
        unit.Multiplier !== null && unit.Multiplier !== undefined && unit.Multiplier !== '' ? String(unit.Multiplier) : '',
        typeof skillTargetText === 'function' ? skillTargetText(unit) : [unit.Target, unit.AreaOfEffect].filter(Boolean).join(' · ')
    ].filter(Boolean);
    return `<div class="passive-skill-unit"><div class="passive-skill-unit-label">${escapeHtml(ui('skillUnit', 'Skill Unit'))} ${index + 1}</div><div class="passive-skill-unit-line">${values.map(value => escapeHtml(value)).join('<span class="passive-skill-unit-separator"> · </span>')}</div></div>`;
}

function renderPassiveSkillDescription(skill) {
    const units = Array.isArray(skill.Units) ? skill.Units.map(renderPassiveSkillUnit).filter(Boolean).join('') : '';
    return `<div class="card detail-section passive-skill-description-card"><h2>${escapeHtml(ui('description', 'Description'))}</h2>${units || `<div class="passive-skill-none">${escapeHtml(ui('none', 'None'))}</div>`}</div>`;
}

function passiveSkillUsedBy(skillKey) {
    const characters = (wiki.characters || []).filter(character =>
        [character.TraitKey1, character.TraitKey2, character.TraitKey3].includes(skillKey)
    );
    const monsters = (wiki.monsters || []).filter(monster => Array.isArray(monster.PassiveSkillKeys) && monster.PassiveSkillKeys.includes(skillKey));
    const jobs = (wiki.jobs || []).filter(job => job.PassiveSkillKey === skillKey || (Array.isArray(job.PassiveSkillKeys) && job.PassiveSkillKeys.includes(skillKey)));
    return { characters, monsters, jobs };
}

function renderPassiveUsedByLinks(entries, type, keyField) {
    if (!entries.length) return `<span class="passive-skill-none">${escapeHtml(ui('none', 'None'))}</span>`;
    if (typeof entityReferenceLink === 'function') {
        return entries.map(entry => entityReferenceLink(type, entry[keyField])).join('<span class="passive-skill-ref-separator"> · </span>');
    }
    return entries.map(entry => `<span>${escapeHtml(entry[keyField])}</span>`).join('<span class="passive-skill-ref-separator"> · </span>');
}

function renderPassiveSkillUsedBy(skill) {
    const used = passiveSkillUsedBy(skill.PassiveSkillKey);
    const rows = [
        infoRow(ui('character', 'Character'), renderPassiveUsedByLinks(used.characters, 'character', 'CharacterKey')),
        infoRow(ui('monster', 'Monster'), renderPassiveUsedByLinks(used.monsters, 'monster', 'MonsterKey')),
        infoRow(ui('job', 'Job'), renderPassiveUsedByLinks(used.jobs, 'job', 'JobKey'))
    ].join('');
    return `<div class="card detail-section passive-skill-used-by"><h2>${escapeHtml(ui('usedBy', 'Used By'))}</h2><div class="info-list">${rows}</div></div>`;
}

function passiveSkillSearchText(skill) {
    const used = passiveSkillUsedBy(skill.PassiveSkillKey);
    return [
        skill.PassiveSkillKey,
        passiveSkillText(skill.PassiveSkillKey),
        skill.Type,
        skill.Element,
        ...(skill.Units || []).flatMap(unit => [unit.Action, unit.Value, unit.Multiplier, unit.Target, unit.AreaOfEffect]),
        ...used.characters.map(character => character.CharacterKey),
        ...used.monsters.map(monster => monster.MonsterKey),
        ...used.jobs.map(job => job.JobKey)
    ].filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
}

function renderPassiveSkills() {
    const cards = wiki.passiveSkills.map(skill => {
        const key = skill.PassiveSkillKey;
        const name = passiveSkillText(key);
        const previewInfo = [
            infoRow(ui('passiveSkill', 'Passive Skill'), escapeHtml(name), 'entity-primary-row'),
            infoRow(ui('type', 'Type'), escapeHtml(readableSkillValue(skill.Type) || '—')),
            infoRow(ui('element', 'Element'), escapeHtml(typeof skillTokenText === 'function' ? skillTokenText(skill.Element || 'None') : readableSkillValue(skill.Element || 'None')))
        ].join('');
        return `<article class="card passive-skill-card entity-list-card" data-key="${escapeHtml(key)}" data-search="${escapeHtml(passiveSkillSearchText(skill))}" onclick="loadPassiveSkillDetail(this.dataset.key)">${renderPassiveSkillImage(skill, name)}<div class="info-list list-info">${previewInfo}</div></article>`;
    }).join('');
    return `<div class="header-card"><h1>${escapeHtml(ui('passiveSkills', 'Passive Skills'))}</h1><p><strong>${wiki.passiveSkills.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p><input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}"></div><div class="grid" id="passiveSkillGrid">${cards}</div>`;
}

function loadPassiveSkillDetail(key, fromRoute = false) {
    const skill = passiveSkillByKey(key);
    if (!skill) return;
    if (!fromRoute && navigateHash('passive-skills', key)) return;

    const name = passiveSkillText(key);
    const basicInfo = [
        infoRow(ui('passiveSkill', 'Passive Skill'), escapeHtml(name)),
        infoRow(ui('type', 'Type'), escapeHtml(readableSkillValue(skill.Type) || '—')),
        infoRow(ui('element', 'Element'), escapeHtml(typeof skillTokenText === 'function' ? skillTokenText(skill.Element || 'None') : readableSkillValue(skill.Element || 'None')))
    ].join('');

    setActiveView('PassiveSkills');
    document.getElementById('content').innerHTML = `<button class="back-btn" onclick="loadView('PassiveSkills')">← ${escapeHtml(ui('back', 'Back'))}</button><div class="detail-stack"><div class="card detail-title-card passive-skill-title-card">${renderPassiveSkillImage(skill, name, true)}<h3>${escapeHtml(name)}</h3></div><div class="card detail-section basic-info-card"><h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2><div class="info-list">${basicInfo}</div></div>${renderPassiveSkillUsedBy(skill)}${renderPassiveSkillDescription(skill)}</div>`;
    window.scrollTo(0, 0);
}

function renderPassiveSkillLoading() {
    return `<div class="header-card"><h1>${escapeHtml(ui('passiveSkills', 'Passive Skills'))}</h1><p>${escapeHtml(ui('loading', 'Loading...'))}</p></div>`;
}

function passiveSkillRouteInfo() {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    const parts = raw.split('/');
    const section = String(parts.shift() || '').toLowerCase();
    return { section, key: decodedRouteKey(parts) };
}

function handlePassiveSkillRoute() {
    const { section, key } = passiveSkillRouteInfo();
    if (section !== 'passive-skills') return false;
    if (!wiki.passiveSkillsReady) {
        setActiveView('PassiveSkills');
        document.getElementById('content').innerHTML = renderPassiveSkillLoading();
        return true;
    }
    if (key && passiveSkillByKey(key)) loadPassiveSkillDetail(key, true);
    else loadView('PassiveSkills', true);
    return true;
}

handleHashRoute = function () {
    if (!wiki.ready) return;
    if (handlePassiveSkillRoute()) return;
    baseHandleHashRouteForPassiveSkills();
};

loadView = function (view, fromRoute = false) {
    if (view !== 'PassiveSkills') return baseLoadViewForPassiveSkills(view, fromRoute);
    if (!fromRoute && navigateHash('passive-skills')) return;
    setActiveView('PassiveSkills');
    const content = document.getElementById('content');
    if (!wiki.passiveSkillsReady) content.innerHTML = renderPassiveSkillLoading();
    else {
        content.innerHTML = renderPassiveSkills();
        attachListSearch('.passive-skill-card');
    }
    window.scrollTo(0, 0);
};

window.addEventListener('hashchange', handleHashRoute);

const passiveSkillDataPromise = (async () => {
    const manifest = await loadJson('data/passive-skills.json', { parts: [], localisationParts: [] });
    const dataParts = await Promise.all((manifest.parts || []).map(path => loadJson(path, [])));
    wiki.passiveSkills = dataParts.flat().sort((a, b) => Number(a.ID) - Number(b.ID));

    const localisationParts = await Promise.all((manifest.localisationParts || []).map(path => loadJson(path, {})));
    localisationParts.forEach(part => Object.entries(part).forEach(([key, value]) => wiki.passiveSkillLocalisation.set(key, value)));
    wiki.passiveSkillsReady = true;

    if (wiki.ready && passiveSkillRouteInfo().section === 'passive-skills') handleHashRoute();
})();

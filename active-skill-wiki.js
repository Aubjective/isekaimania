// Active Skill wiki module. ActiveSkillKey is the stable route/reference key; localisation controls display text.
wiki.activeSkills = [];
wiki.activeSkillLocalisation = new Map();
wiki.skillDescriptionLocalisation = new Map();
wiki.activeSkillsReady = false;

const baseHandleHashRouteForActiveSkills = handleHashRoute;
const baseLoadViewForActiveSkills = loadView;
const baseSkillLinkForActiveSkills = skillLink;
window.removeEventListener('hashchange', baseHandleHashRouteForActiveSkills);

function activeSkillLocaleRow(key) {
    return wiki.activeSkillLocalisation.get(key) || {};
}

function activeSkillText(key) {
    const row = activeSkillLocaleRow(key).Name || {};
    return row[wiki.locale] || row.en || key;
}

function activeSkillByKey(key) {
    return wiki.activeSkills.find(skill => skill.ActiveSkillKey === key);
}

function skillDescriptionText(key, fallback = '') {
    const row = wiki.skillDescriptionLocalisation.get(key) || {};
    return row[wiki.locale] || row.en || fallback || key;
}

function readableSkillValue(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return String(value);
}

function activeSkillReferenceLink(key) {
    if (!key) return '';
    const skill = activeSkillByKey(key);
    if (!skill) return baseSkillLinkForActiveSkills(key);
    return `<span class="link active-skill-link" data-active-skill-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadActiveSkillDetail(this.dataset.activeSkillKey)">${escapeHtml(activeSkillText(key))}</span>`;
}

// Upgrade existing Job and other skill references only when the key is a live Active Skill.
skillLink = function (key) {
    if (activeSkillByKey(key)) return activeSkillReferenceLink(key);
    return baseSkillLinkForActiveSkills(key);
};

// Upgrade Monster Active Skill references while preserving Passive Skill placeholders.
const baseFutureReferenceLinkForActiveSkills = futureReferenceLink;
futureReferenceLink = function (type, key) {
    if (type === 'skill' && activeSkillByKey(key)) return activeSkillReferenceLink(key);
    return baseFutureReferenceLinkForActiveSkills(type, key);
};

function renderActiveSkillImage(skill, name, detail = false) {
    const sprite = skill.Sprite || skill.ActiveSkillKey;
    const sizeClass = detail ? 'entity-image-detail' : 'entity-image-list';
    const loading = detail ? 'eager' : 'lazy';
    return `<div class="entity-image-slot ${sizeClass}"><img src="activeskillsprite/${encodeURIComponent(sprite)}.png" alt="${escapeHtml(name)}" loading="${loading}" decoding="async" onerror="this.style.display='none'"></div>`;
}

function skillTargetText(unit) {
    const side = unit.Target || '';
    const area = unit.AreaOfEffect || '';
    const keyByTarget = {
        'Ally|O': 'TargetOwn',
        'Ally|C': 'TargetClosestAlly',
        'Ally|All': 'TargetAllAllies',
        'Ally|LHP': 'TargetLHPAlly',
        'Enemy|O': 'TargetOppositeEnemy',
        'Enemy|C': 'TargetClosestEnemy',
        'Enemy|All': 'TargetAllEnemies',
        'Enemy|LHP': 'TargetLHPEnemy'
    };
    const mapped = keyByTarget[`${side}|${area}`];
    if (mapped) return skillDescriptionText(mapped, `${readableSkillValue(side)} ${readableSkillValue(area)}`.trim());
    return [readableSkillValue(side), readableSkillValue(area)].filter(Boolean).join(' · ');
}

function skillUnitActionText(action) {
    const aliases = {
        Damage: 'Damage',
        Heal: 'Heal',
        Shield: 'Shield',
        Buff: 'Buff',
        Debuff: 'FormulaDebuffValue',
        Increase: 'IncreaseDecreaseCapTitle',
        Decrease: 'IncreaseDecreaseCapTitle',
        Recover: 'RecoverX',
        Dispel: 'DispelX',
        StatusBuff: 'Buff',
        StatusDebuff: 'AllStatusDebuffs'
    };
    const key = aliases[action];
    let text = key ? skillDescriptionText(key, readableSkillValue(action)) : readableSkillValue(action);
    // Template-bearing source strings are not suitable as standalone labels.
    if (text.includes('{')) text = readableSkillValue(action);
    if (action === 'Decrease' && wiki.locale === 'en') text = 'Decrease';
    if (action === 'Increase' && wiki.locale === 'en') text = 'Increase';
    if (action === 'StatusBuff' && wiki.locale === 'en') text = 'Status Buff';
    if (action === 'StatusDebuff' && wiki.locale === 'en') text = 'Status Debuff';
    if (action === 'Debuff' && wiki.locale === 'en') text = 'Debuff';
    return text;
}

function skillTokenText(value) {
    if (value === null || value === undefined || value === '') return '';
    const raw = String(value);
    // Resistance keys in the ActiveSkills sheet use *Resistance while the shared description table uses *Resist.
    let alias = raw;
    if (raw === 'ElementAffinity') alias = 'ElementalAffinity';
    else if (raw.endsWith('Resistance')) alias = `${raw.slice(0, -10)}Resist`;
    return skillDescriptionText(alias, readableSkillValue(raw));
}

function renderSkillUnit(unit, index) {
    if (!unit || !unit.Action) return '';
    const values = [
        skillUnitActionText(unit.Action),
        skillTokenText(unit.Value),
        unit.Multiplier !== null && unit.Multiplier !== undefined && unit.Multiplier !== '' ? String(unit.Multiplier) : '',
        unit.Duration !== null && unit.Duration !== undefined && unit.Duration !== '' ? `${unit.Duration} ${skillDescriptionText('Second', 'sec')}` : '',
        skillTargetText(unit)
    ].filter(Boolean);
    return `<div class="active-skill-unit"><div class="active-skill-unit-label">${escapeHtml(ui('skillUnit', 'Skill Unit'))} ${index + 1}</div><div class="active-skill-unit-line">${values.map(value => escapeHtml(value)).join('<span class="active-skill-unit-separator"> · </span>')}</div></div>`;
}

function renderActiveSkillDescription(skill) {
    const units = Array.isArray(skill.Units) ? skill.Units.map(renderSkillUnit).filter(Boolean).join('') : '';
    return `<div class="card detail-section active-skill-description-card"><h2>${escapeHtml(ui('description', 'Description'))}</h2>${units || `<div class="active-skill-none">${escapeHtml(ui('none', 'None'))}</div>`}</div>`;
}

function entityReferenceLink(type, key) {
    if (type === 'job' && typeof jobLink === 'function') return jobLink(key);
    if (type === 'monster' && typeof loadMonsterDetail === 'function') {
        const monster = Array.isArray(wiki.monsters) ? wiki.monsters.find(entry => entry.MonsterKey === key) : null;
        const name = monster && typeof monsterText === 'function' ? monsterText(key) : key;
        return `<span class="link monster-link" data-monster-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadMonsterDetail(this.dataset.monsterKey)">${escapeHtml(name)}</span>`;
    }
    if (type === 'character' && typeof loadCharacterDetail === 'function') {
        const character = Array.isArray(wiki.characters) ? wiki.characters.find(entry => entry.CharacterKey === key) : null;
        const name = character && typeof characterText === 'function' ? characterText(key, 'Name') : key;
        return `<span class="link character-link" data-character-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadCharacterDetail(this.dataset.characterKey)">${escapeHtml(name)}</span>`;
    }
    return `<span>${escapeHtml(key)}</span>`;
}

function activeSkillUsedBy(skillKey) {
    const characters = (wiki.characters || []).filter(character =>
        character.ActiveSkillKey === skillKey || (Array.isArray(character.ActiveSkillKeys) && character.ActiveSkillKeys.includes(skillKey))
    );
    const monsters = (wiki.monsters || []).filter(monster => Array.isArray(monster.ActiveSkillKeys) && monster.ActiveSkillKeys.includes(skillKey));
    const jobs = (wiki.jobs || []).filter(job => job.ActiveSkillKey === skillKey || (Array.isArray(job.ActiveSkillKeys) && job.ActiveSkillKeys.includes(skillKey)));
    return { characters, monsters, jobs };
}

function renderUsedByLinks(entries, type, keyField) {
    if (!entries.length) return `<span class="active-skill-none">${escapeHtml(ui('none', 'None'))}</span>`;
    return entries.map(entry => entityReferenceLink(type, entry[keyField])).join('<span class="active-skill-ref-separator"> · </span>');
}

function renderActiveSkillUsedBy(skill) {
    const used = activeSkillUsedBy(skill.ActiveSkillKey);
    const rows = [
        infoRow(ui('character', 'Character'), renderUsedByLinks(used.characters, 'character', 'CharacterKey')),
        infoRow(ui('monster', 'Monster'), renderUsedByLinks(used.monsters, 'monster', 'MonsterKey')),
        infoRow(ui('job', 'Job'), renderUsedByLinks(used.jobs, 'job', 'JobKey'))
    ].join('');
    return `<div class="card detail-section active-skill-used-by"><h2>${escapeHtml(ui('usedBy', 'Used By'))}</h2><div class="info-list">${rows}</div></div>`;
}

function activeSkillSearchText(skill) {
    const used = activeSkillUsedBy(skill.ActiveSkillKey);
    return [
        skill.ActiveSkillKey,
        activeSkillText(skill.ActiveSkillKey),
        skill.Tier,
        skill.Element,
        skill.Cooldown,
        skill.Sprite,
        ...skill.Units.flatMap(unit => [unit.Action, unit.Value, unit.Multiplier, unit.Duration, unit.Target, unit.AreaOfEffect]),
        ...used.characters.map(character => character.CharacterKey),
        ...used.monsters.map(monster => monster.MonsterKey),
        ...used.jobs.map(job => job.JobKey)
    ].filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
}

function renderActiveSkills() {
    const cards = wiki.activeSkills.map(skill => {
        const key = skill.ActiveSkillKey;
        const name = activeSkillText(key);
        const previewInfo = [
            infoRow(ui('activeSkill', 'Active Skill'), escapeHtml(name), 'entity-primary-row'),
            infoRow(ui('tier', 'Tier'), escapeHtml(readableSkillValue(skill.Tier) || '—')),
            infoRow(ui('element', 'Element'), escapeHtml(skillTokenText(skill.Element || 'None'))),
            infoRow(ui('cooldown', 'Cooldown'), escapeHtml(skill.Cooldown ?? '—'))
        ].join('');
        return `<article class="card active-skill-card entity-list-card" data-key="${escapeHtml(key)}" data-search="${escapeHtml(activeSkillSearchText(skill))}" onclick="loadActiveSkillDetail(this.dataset.key)">${renderActiveSkillImage(skill, name)}<div class="info-list list-info">${previewInfo}</div></article>`;
    }).join('');
    return `<div class="header-card"><h1>${escapeHtml(ui('activeSkills', 'Active Skills'))}</h1><p><strong>${wiki.activeSkills.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p><input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}"></div><div class="grid" id="activeSkillGrid">${cards}</div>`;
}

function loadActiveSkillDetail(key, fromRoute = false) {
    const skill = activeSkillByKey(key);
    if (!skill) return;
    if (!fromRoute && navigateHash('active-skills', key)) return;

    const name = activeSkillText(key);
    const basicInfo = [
        infoRow(ui('activeSkill', 'Active Skill'), escapeHtml(name)),
        infoRow(ui('tier', 'Tier'), escapeHtml(readableSkillValue(skill.Tier) || '—')),
        infoRow(ui('element', 'Element'), escapeHtml(skillTokenText(skill.Element || 'None'))),
        infoRow(ui('cooldown', 'Cooldown'), escapeHtml(skill.Cooldown ?? '—'))
    ].join('');

    setActiveView('ActiveSkills');
    document.getElementById('content').innerHTML = `<button class="back-btn" onclick="loadView('ActiveSkills')">← ${escapeHtml(ui('back', 'Back'))}</button><div class="detail-stack"><div class="card detail-title-card active-skill-title-card">${renderActiveSkillImage(skill, name, true)}<h3>${escapeHtml(name)}</h3></div><div class="card detail-section basic-info-card"><h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2><div class="info-list">${basicInfo}</div></div>${renderActiveSkillUsedBy(skill)}${renderActiveSkillDescription(skill)}</div>`;
    window.scrollTo(0, 0);
}

function renderActiveSkillLoading() {
    return `<div class="header-card"><h1>${escapeHtml(ui('activeSkills', 'Active Skills'))}</h1><p>${escapeHtml(ui('loading', 'Loading...'))}</p></div>`;
}

function activeSkillRouteInfo() {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    const parts = raw.split('/');
    const section = String(parts.shift() || '').toLowerCase();
    return { section, key: decodedRouteKey(parts) };
}

function handleActiveSkillRoute() {
    const { section, key } = activeSkillRouteInfo();
    if (section !== 'active-skills') return false;
    if (!wiki.activeSkillsReady) {
        setActiveView('ActiveSkills');
        document.getElementById('content').innerHTML = renderActiveSkillLoading();
        return true;
    }
    if (key && activeSkillByKey(key)) loadActiveSkillDetail(key, true);
    else loadView('ActiveSkills', true);
    return true;
}

handleHashRoute = function () {
    if (!wiki.ready) return;
    if (handleActiveSkillRoute()) return;
    baseHandleHashRouteForActiveSkills();
};

loadView = function (view, fromRoute = false) {
    if (view !== 'ActiveSkills') return baseLoadViewForActiveSkills(view, fromRoute);
    if (!fromRoute && navigateHash('active-skills')) return;
    setActiveView('ActiveSkills');
    const content = document.getElementById('content');
    if (!wiki.activeSkillsReady) content.innerHTML = renderActiveSkillLoading();
    else {
        content.innerHTML = renderActiveSkills();
        attachListSearch('.active-skill-card');
    }
    window.scrollTo(0, 0);
};

window.addEventListener('hashchange', handleHashRoute);

const activeSkillDataPromise = (async () => {
    const manifest = await loadJson('data/active-skills.json', { parts: [], localisationParts: [], descriptionLocalisation: '' });
    const dataParts = await Promise.all((manifest.parts || []).map(path => loadJson(path, [])));
    wiki.activeSkills = dataParts.flat().sort((a, b) => Number(a.ID) - Number(b.ID));

    const localisationParts = await Promise.all((manifest.localisationParts || []).map(path => loadJson(path, {})));
    localisationParts.forEach(part => Object.entries(part).forEach(([key, value]) => wiki.activeSkillLocalisation.set(key, value)));

    if (manifest.descriptionLocalisation) {
        const descriptions = await loadJson(manifest.descriptionLocalisation, {});
        Object.entries(descriptions).forEach(([key, value]) => wiki.skillDescriptionLocalisation.set(key, value));
    }
    wiki.activeSkillsReady = true;

    if (wiki.ready && activeSkillRouteInfo().section === 'active-skills') handleHashRoute();
})();

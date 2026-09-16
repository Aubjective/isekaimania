// Monster wiki module. Keeps monster data/routes isolated from the core Character/Job implementation.
wiki.monsters = [];
wiki.monsterLocalisation = new Map();
wiki.monstersReady = false;

const baseHandleHashRouteForMonsters = handleHashRoute;
const baseLoadViewForMonsters = loadView;
window.removeEventListener('hashchange', baseHandleHashRouteForMonsters);

function monsterText(key) {
    const row = wiki.monsterLocalisation.get(key) || {};
    return row[wiki.locale] || row.en || key;
}

function futureReferenceLink(type, key) {
    if (!key) return '';
    const titleByType = {
        item: ui('itemComingSoon', 'Item details will be connected when item pages are added.'),
        equipment: ui('equipmentComingSoon', 'Equipment details will be connected when equipment pages are added.'),
        skill: ui('skillComingSoon', 'Skill details will be connected when skill pages are added.')
    };
    return `<span class="link future-reference ${escapeHtml(type)}-link" data-reference-type="${escapeHtml(type)}" data-reference-key="${escapeHtml(key)}" title="${escapeHtml(titleByType[type] || '')}" onclick="event.stopPropagation()">${escapeHtml(key)}</span>`;
}

function renderReferenceList(keys, type) {
    const list = Array.isArray(keys) ? keys.filter(Boolean) : [];
    return list.map(key => futureReferenceLink(type, key)).join('<span class="monster-ref-separator"> · </span>');
}

// Loot cells use ItemKey-N as quantity syntax. Keep the raw sheet token in JSON,
// but resolve the clickable reference to the exact base item/equipment key here.
function parseLootToken(token) {
    const raw = String(token || '').trim();
    if (!raw) return null;
    const match = raw.match(/^(.*?)-(\d+)$/);
    if (match && match[1].trim()) return { key: match[1].trim(), quantity: Number(match[2]), raw, valid: true };
    if (/^-\d+$/.test(raw)) return { key: '', quantity: Number(raw.slice(1)), raw, valid: false };
    return { key: raw, quantity: 1, raw, valid: true };
}

function renderLootReferenceList(tokens, type) {
    const list = Array.isArray(tokens) ? tokens.map(parseLootToken).filter(Boolean) : [];
    return list.map(entry => {
        if (!entry.valid || !entry.key) {
            return `<span class="monster-invalid-ref" title="${escapeHtml(ui('malformedLoot', 'Malformed source loot token.'))}">${escapeHtml(entry.raw)}</span>`;
        }
        const quantity = entry.quantity > 1 ? `<span class="loot-quantity">×${escapeHtml(entry.quantity)}</span>` : '';
        return `${futureReferenceLink(type, entry.key)}${quantity}`;
    }).join('<span class="monster-ref-separator"> · </span>');
}

function monsterSearchText(monster) {
    return [
        monster.MonsterKey,
        monsterText(monster.MonsterKey),
        monster.Rarity,
        monster.Race,
        monster.Element,
        monster.Growth,
        ...(monster.PassiveSkillKeys || []),
        ...(monster.ActiveSkillKeys || []),
        ...(monster.ItemLootKeys || []),
        ...(monster.EquipmentLootKeys || [])
    ].filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
}

function renderMonsters() {
    const cards = wiki.monsters.map(monster => {
        const key = monster.MonsterKey;
        const name = monsterText(key);
        const previewInfo = [
            infoRow(ui('monster', 'Monster'), escapeHtml(name), 'entity-primary-row'),
            infoRow(ui('rarity', 'Rarity'), escapeHtml(rarityStars(monster.Rarity))),
            infoRow(ui('race', 'Race'), escapeHtml(monster.Race || '')),
            infoRow(ui('element', 'Element'), escapeHtml(monster.Element || 'None'))
        ].join('');
        return `<article class="card monster-card entity-list-card" data-key="${escapeHtml(key)}" data-search="${escapeHtml(monsterSearchText(monster))}" onclick="loadMonsterDetail(this.dataset.key)"><div class="monster-list-mark" aria-hidden="true">👾</div><div class="info-list list-info">${previewInfo}</div></article>`;
    }).join('');
    return `<div class="header-card"><h1>${escapeHtml(ui('monsters', 'Monsters'))}</h1><p><strong>${wiki.monsters.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p><input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}"></div><div class="grid" id="monsterGrid">${cards}</div>`;
}

function renderMonsterSkills(monster) {
    const passive = renderReferenceList(monster.PassiveSkillKeys, 'skill');
    const active = renderReferenceList(monster.ActiveSkillKeys, 'skill');
    if (!passive && !active) return '';
    const rows = [
        passive ? infoRow(ui('passiveSkills', 'Passive Skills'), passive) : '',
        active ? infoRow(ui('activeSkills', 'Active Skills'), active) : ''
    ].join('');
    return `<div class="card detail-section"><h2>${escapeHtml(ui('skills', 'Skills'))}</h2><div class="info-list">${rows}</div></div>`;
}

function renderMonsterLoot(monster) {
    const items = renderLootReferenceList(monster.ItemLootKeys, 'item');
    const equipment = renderLootReferenceList(monster.EquipmentLootKeys, 'equipment');
    if (!items && !equipment) return '';
    const rows = [
        items ? infoRow(ui('itemLoots', 'Item Loots'), items) : '',
        equipment ? infoRow(ui('equipmentLoots', 'Equipment Loots'), equipment) : ''
    ].join('');
    return `<div class="card detail-section"><h2>${escapeHtml(ui('loot', 'Loot'))}</h2><div class="info-list">${rows}</div><p class="monster-loot-note">${escapeHtml(ui('lootSeriesNote', 'Each listed entry is a possible loot result. Quantities are shown with ×. Repeated entries are preserved from the source data.'))}</p></div>`;
}

function loadMonsterDetail(key, fromRoute = false) {
    const monster = wiki.monsters.find(item => item.MonsterKey === key);
    if (!monster) return;
    if (!fromRoute && navigateHash('monsters', key)) return;

    const name = monsterText(key);
    const stats = monster.Stats || {};
    const basicInfo = [
        infoRow(ui('monster', 'Monster'), escapeHtml(name)),
        infoRow(ui('rarity', 'Rarity'), escapeHtml(rarityStars(monster.Rarity))),
        infoRow(ui('race', 'Race'), escapeHtml(monster.Race || '')),
        infoRow(ui('element', 'Element'), escapeHtml(monster.Element || 'None')),
        infoRow(ui('growth', 'Growth'), escapeHtml(monster.Growth || ''))
    ].join('');
    const statInfo = [
        infoRow(ui('constitution', 'Constitution'), escapeHtml(stats.Constitution ?? '')),
        infoRow(ui('strength', 'Strength'), escapeHtml(stats.Strength ?? '')),
        infoRow(ui('agility', 'Agility'), escapeHtml(stats.Agility ?? '')),
        infoRow(ui('intelligence', 'Intelligence'), escapeHtml(stats.Intelligence ?? ''))
    ].join('');

    setActiveView('Monsters');
    document.getElementById('content').innerHTML = `<button class="back-btn" onclick="loadView('Monsters')">← ${escapeHtml(ui('back', 'Back'))}</button><div class="detail-stack"><div class="card detail-title-card monster-title-card"><div class="monster-detail-mark" aria-hidden="true">👾</div><h3>${escapeHtml(name)}</h3></div><div class="card detail-section basic-info-card"><h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2><div class="info-list">${basicInfo}</div></div><div class="card detail-section"><h2>${escapeHtml(ui('mainStats', 'Main Stats'))}</h2><div class="info-list">${statInfo}</div></div>${renderMonsterSkills(monster)}${renderMonsterLoot(monster)}</div>`;
    window.scrollTo(0, 0);
}

function renderMonsterLoading() {
    return `<div class="header-card"><h1>${escapeHtml(ui('monsters', 'Monsters'))}</h1><p>${escapeHtml(ui('loading', 'Loading...'))}</p></div>`;
}

function monsterRouteInfo() {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    const parts = raw.split('/');
    const section = String(parts.shift() || '').toLowerCase();
    return { section, key: decodedRouteKey(parts) };
}

function handleMonsterRoute() {
    const { section, key } = monsterRouteInfo();
    if (section !== 'monsters') return false;
    if (!wiki.monstersReady) {
        setActiveView('Monsters');
        document.getElementById('content').innerHTML = renderMonsterLoading();
        return true;
    }
    if (key && wiki.monsters.some(item => item.MonsterKey === key)) loadMonsterDetail(key, true);
    else loadView('Monsters', true);
    return true;
}

handleHashRoute = function () {
    if (!wiki.ready) return;
    if (handleMonsterRoute()) return;
    baseHandleHashRouteForMonsters();
};

loadView = function (view, fromRoute = false) {
    if (view !== 'Monsters') return baseLoadViewForMonsters(view, fromRoute);
    if (!fromRoute && navigateHash('monsters')) return;
    setActiveView('Monsters');
    const content = document.getElementById('content');
    if (!wiki.monstersReady) content.innerHTML = renderMonsterLoading();
    else {
        content.innerHTML = renderMonsters();
        attachListSearch('.monster-card');
    }
    window.scrollTo(0, 0);
};

window.addEventListener('hashchange', handleHashRoute);

const monsterDataPromise = (async () => {
    const manifest = await loadJson('data/monsters.json', { parts: [], localisationParts: [] });
    const dataParts = await Promise.all((manifest.parts || []).map(path => loadJson(path, [])));
    wiki.monsters = dataParts.flat().sort((a, b) => Number(a.ID) - Number(b.ID));

    const localisationParts = await Promise.all((manifest.localisationParts || []).map(path => loadJson(path, {})));
    localisationParts.forEach(part => Object.entries(part).forEach(([key, value]) => wiki.monsterLocalisation.set(key, value)));
    wiki.monstersReady = true;

    if (wiki.ready && monsterRouteInfo().section === 'monsters') handleHashRoute();
})();

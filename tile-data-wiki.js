// Tile Data wiki module. TileDataKey is the stable route/reference key; localisation controls display text.
// Only implemented source rows with a numeric ID are present in data/tile-data/*.
wiki.tileData = [];
wiki.tileDataLocalisation = new Map();
wiki.tileDataReady = false;

const baseHandleHashRouteForTileData = handleHashRoute;
const baseLoadViewForTileData = loadView;
window.removeEventListener('hashchange', baseHandleHashRouteForTileData);

function tileDataLocaleRow(key) {
    return wiki.tileDataLocalisation.get(key) || {};
}

function tileDataText(key) {
    const row = tileDataLocaleRow(key).Name || {};
    return row[wiki.locale] || row.en || key;
}

function tileDataByKey(key) {
    return wiki.tileData.find(tile => tile.TileDataKey === key);
}

function renderTileDataImage(tile, name, detail = false) {
    const key = tile.SpriteKey || tile.TileDataKey;
    const sizeClass = detail ? 'entity-image-detail' : 'entity-image-list';
    const loading = detail ? 'eager' : 'lazy';
    return `<div class="entity-image-slot ${sizeClass}"><img src="tilesprite/${encodeURIComponent(key)}.png" alt="${escapeHtml(name)}" loading="${loading}" decoding="async" onerror="this.style.display='none'"></div>`;
}

function tileDataReferenceLink(key) {
    if (!key) return '';
    const tile = tileDataByKey(key);
    const name = tileDataText(key);
    if (!tile) return `<span>${escapeHtml(name)}</span>`;
    return `<span class="link tile-data-link" data-tile-data-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadTileDataDetail(this.dataset.tileDataKey)">${escapeHtml(name)}</span>`;
}

function tileChestReferenceLink(key) {
    if (!key) return `<span class="tile-empty-slot">—</span>`;
    if (typeof chestByKey === 'function' && chestByKey(key)) {
        const name = typeof chestText === 'function' ? chestText(key) : key;
        return `<span class="link chest-link" data-chest-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadChestDetail(this.dataset.chestKey)">${escapeHtml(name)}</span>`;
    }
    return `<span>${escapeHtml(key)}</span>`;
}

function tileItemReferenceLink(key) {
    if (!key) return `<span class="tile-empty-slot">—</span>`;
    if (typeof itemByKey === 'function' && itemByKey(key)) return itemReferenceLink(key);
    return `<span>${escapeHtml(key)}</span>`;
}

function tileEquipmentReferenceLink(key) {
    if (!key) return `<span class="tile-empty-slot">—</span>`;
    if (typeof equipmentByKey === 'function' && equipmentByKey(key)) return equipmentReferenceLink(key);
    return `<span>${escapeHtml(key)}</span>`;
}

function tileSkillReferenceLink(key) {
    if (!key) return `<span class="tile-empty-slot">—</span>`;
    if (typeof activeSkillByKey === 'function' && activeSkillByKey(key) && typeof activeSkillReferenceLink === 'function') return activeSkillReferenceLink(key);
    if (typeof passiveSkillByKey === 'function' && passiveSkillByKey(key) && typeof passiveSkillReferenceLink === 'function') return passiveSkillReferenceLink(key);
    if (typeof skillLink === 'function') return skillLink(key);
    return `<span>${escapeHtml(key)}</span>`;
}

function enemyTeamByKey(key) {
    if (!key || !Array.isArray(wiki.enemyTeams)) return null;
    return wiki.enemyTeams.find(team => team[1] === key) || null;
}

function enemyTeamReferenceLink(key) {
    if (!key) return `<span class="tile-empty-slot">—</span>`;
    const team = enemyTeamByKey(key);
    const name = typeof enemyTeamText === 'function' ? enemyTeamText(key) : key;
    if (!team) return `<span>${escapeHtml(name)}</span>`;
    return `<span class="link enemy-team-link" data-enemy-team-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadEnemyTeamDetail(this.dataset.enemyTeamKey)">${escapeHtml(name)}</span>`;
}

function tileReferenceList(values, renderer, preserveEmpty = false) {
    const list = Array.isArray(values) ? values : [];
    const visible = preserveEmpty ? list : list.filter(Boolean);
    if (!visible.length) return `<span class="tile-none">${escapeHtml(ui('none', 'None'))}</span>`;
    return `<span class="tile-reference-list">${visible.map(value => renderer(value)).join('<span class="tile-ref-separator"> · </span>')}</span>`;
}

function renderTileTravelLevel(travel) {
    const list = Array.isArray(travel) ? travel : [];
    if (!list.length) return `<span class="tile-none">${escapeHtml(ui('none', 'None'))}</span>`;
    return list.map(entry => {
        const type = entry && entry.Type !== undefined ? entry.Type : '';
        const level = entry && entry.Level !== undefined && entry.Level !== null ? entry.Level : '';
        return `<span class="travel-ref">${escapeHtml(type)}${level !== '' ? `-${escapeHtml(level)}` : ''}</span>`;
    }).join('<span class="travel-separator"> · </span>');
}

function tileBoolean(value) {
    return value ? escapeHtml(ui('yes', 'Yes')) : escapeHtml(ui('no', 'No'));
}

function tileRawValue(value) {
    if (value === null || value === undefined || value === '') return `<span class="tile-none">${escapeHtml(ui('none', 'None'))}</span>`;
    return escapeHtml(value);
}

function tileRecognisedTokenLink(token) {
    const value = String(token || '').trim();
    if (!value) return `<span class="tile-empty-slot">—</span>`;
    if (tileDataByKey(value)) return tileDataReferenceLink(value);
    if (typeof itemByKey === 'function' && itemByKey(value)) return tileItemReferenceLink(value);
    if (typeof equipmentByKey === 'function' && equipmentByKey(value)) return tileEquipmentReferenceLink(value);
    if (typeof chestByKey === 'function' && chestByKey(value)) return tileChestReferenceLink(value);
    if (enemyTeamByKey(value)) return enemyTeamReferenceLink(value);
    if (typeof activeSkillByKey === 'function' && activeSkillByKey(value)) return tileSkillReferenceLink(value);
    if (typeof passiveSkillByKey === 'function' && passiveSkillByKey(value)) return tileSkillReferenceLink(value);
    return `<span>${escapeHtml(value)}</span>`;
}

function renderLockHintVariable(value) {
    const raw = String(value || '').trim();
    if (!raw) return `<span class="tile-none">${escapeHtml(ui('none', 'None'))}</span>`;
    return raw.split('-').map(part => tileRecognisedTokenLink(part)).join('<span class="tile-ref-separator"> - </span>');
}

function tileSearchText(tile) {
    return [
        tile.TileDataKey,
        tileDataText(tile.TileDataKey),
        tile.SpriteKey,
        tile.SubLayer,
        tile.TileType,
        tile.ExtraTravelTime,
        tile.MinimumLevel,
        tile.MaximumLevel,
        tile.LockHintDescr,
        tile.LockHintVariable,
        ...(tile.TravelLevel || []).flatMap(entry => [entry.Type, entry.Level]),
        ...(tile.EnemyTeamsDay || []),
        ...(tile.EnemyTeamsNight || []),
        ...(tile.SpecialTeamsDay || []),
        ...(tile.SpecialTeamsNight || []),
        ...(tile.ItemLootKeys || []),
        ...(tile.EquipmentLootKeys || []),
        ...(tile.ChestKeys || []),
        ...(tile.ItemMerchantKeys || []),
        ...(tile.EquipmentMerchantKeys || []),
        ...(tile.SkillMerchantKeys || []),
        ...(tile.StandardEvents || [])
    ].filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
}

function renderTileDataList() {
    const cards = wiki.tileData.map(tile => {
        const key = tile.TileDataKey;
        const name = tileDataText(key);
        const levelRange = `${tile.MinimumLevel ?? ''}–${tile.MaximumLevel ?? ''}`;
        const previewInfo = [
            infoRow(ui('tileData', 'Tile Data'), escapeHtml(name), 'entity-primary-row'),
            infoRow(ui('tileType', 'Tile Type'), escapeHtml(tile.TileType || '')),
            infoRow(ui('travelLevel', 'Travel Level'), renderTileTravelLevel(tile.TravelLevel)),
            infoRow(ui('levelRange', 'Level Range'), escapeHtml(levelRange))
        ].join('');
        return `<article class="card tile-data-card entity-list-card" data-key="${escapeHtml(key)}" data-search="${escapeHtml(tileSearchText(tile))}" onclick="loadTileDataDetail(this.dataset.key)">${renderTileDataImage(tile, name)}<div class="info-list list-info">${previewInfo}</div></article>`;
    }).join('');
    return `<div class="header-card"><h1>${escapeHtml(ui('tileData', 'Tile Data'))}</h1><p><strong>${wiki.tileData.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p><input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}"></div><div class="grid" id="tileDataGrid">${cards}</div>`;
}

function renderTileBasicInfo(tile) {
    const rows = [
        infoRow(ui('subLayer', 'Sub Layer'), tileRawValue(tile.SubLayer)),
        infoRow(ui('travelLevel', 'Travel Level'), renderTileTravelLevel(tile.TravelLevel)),
        infoRow(ui('extraTravelTime', 'Extra Travel Time'), escapeHtml(tile.ExtraTravelTime ?? 0)),
        infoRow(ui('minimumLevel', 'Minimum Level'), escapeHtml(tile.MinimumLevel ?? 0)),
        infoRow(ui('maximumLevel', 'Maximum Level'), escapeHtml(tile.MaximumLevel ?? 0))
    ].join('');
    return `<div class="card detail-section basic-info-card"><h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2><div class="info-list">${rows}</div></div>`;
}

function renderTileMoreInfo(tile) {
    const rows = [
        infoRow(ui('tileType', 'Tile Type'), tileRawValue(tile.TileType)),
        infoRow(ui('oneTimeRewards', 'One Time Rewards'), tileBoolean(tile.OneTimeRewards)),
        infoRow(ui('locked', 'Locked'), tileBoolean(tile.Locked)),
        infoRow(ui('lockHintDescr', 'Lock Hint Descr'), tileRawValue(tile.LockHintDescr)),
        infoRow(ui('lockHintVariable', 'Lock Hint Variable'), renderLockHintVariable(tile.LockHintVariable)),
        infoRow(ui('standardEvents', 'Standard Events'), tileReferenceList(tile.StandardEvents, value => `<span>${escapeHtml(value)}</span>`, true))
    ].join('');
    return `<div class="card detail-section tile-more-info"><h2>${escapeHtml(ui('moreInfo', 'More Info'))}</h2><div class="info-list">${rows}</div></div>`;
}

function renderTileEnemyTeams(tile) {
    const rows = [
        infoRow(ui('enemyTeamsDay', 'Enemy Teams (Day)'), tileReferenceList(tile.EnemyTeamsDay, enemyTeamReferenceLink, true)),
        infoRow(ui('enemyTeamsNight', 'Enemy Teams (Night)'), tileReferenceList(tile.EnemyTeamsNight, enemyTeamReferenceLink, true)),
        infoRow(ui('specialTeamsDay', 'Special Teams (Day)'), tileReferenceList(tile.SpecialTeamsDay, enemyTeamReferenceLink, true)),
        infoRow(ui('specialTeamsNight', 'Special Teams (Night)'), tileReferenceList(tile.SpecialTeamsNight, enemyTeamReferenceLink, true))
    ].join('');
    return `<div class="card detail-section tile-enemy-teams"><h2>${escapeHtml(ui('enemyTeams', 'Enemy Teams'))}</h2><div class="info-list">${rows}</div></div>`;
}

function renderTileLoots(tile) {
    const rows = [
        infoRow(ui('items', 'Items'), tileReferenceList(tile.ItemLootKeys, tileItemReferenceLink, true)),
        infoRow(ui('equipments', 'Equipment'), tileReferenceList(tile.EquipmentLootKeys, tileEquipmentReferenceLink, true)),
        infoRow(ui('dungeonArenaRandomChest', 'Dungeon/Arena or Random Chest'), tileReferenceList(tile.ChestKeys, tileChestReferenceLink, true))
    ].join('');
    return `<div class="card detail-section tile-loots"><h2>${escapeHtml(ui('loots', 'Loots'))}</h2><div class="info-list">${rows}</div></div>`;
}

function renderTileMerchant(tile) {
    const rows = [
        infoRow(ui('item', 'Item'), tileReferenceList(tile.ItemMerchantKeys, tileItemReferenceLink, true)),
        infoRow(ui('equipment', 'Equipment'), tileReferenceList(tile.EquipmentMerchantKeys, tileEquipmentReferenceLink, true)),
        infoRow(ui('skill', 'Skill'), tileReferenceList(tile.SkillMerchantKeys, tileSkillReferenceLink, true))
    ].join('');
    return `<div class="card detail-section tile-merchant"><h2>${escapeHtml(ui('merchant', 'Merchant'))}</h2><div class="info-list">${rows}</div></div>`;
}

function loadTileDataDetail(key, fromRoute = false) {
    const tile = tileDataByKey(key);
    if (!tile) return;
    if (!fromRoute && navigateHash('tiles', key)) return;

    const name = tileDataText(key);
    setActiveView('TileData');
    document.getElementById('content').innerHTML = `<button class="back-btn" onclick="loadView('TileData')">← ${escapeHtml(ui('back', 'Back'))}</button><div class="detail-stack"><div class="card detail-title-card tile-data-title-card">${renderTileDataImage(tile, name, true)}<h3>${escapeHtml(name)}</h3></div>${renderTileBasicInfo(tile)}${renderTileMoreInfo(tile)}${renderTileEnemyTeams(tile)}${renderTileLoots(tile)}${renderTileMerchant(tile)}</div>`;
    window.scrollTo(0, 0);
}

function renderTileDataLoading() {
    return `<div class="header-card"><h1>${escapeHtml(ui('tileData', 'Tile Data'))}</h1><p>${escapeHtml(ui('loading', 'Loading...'))}</p></div>`;
}

function tileDataRouteInfo() {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    const parts = raw.split('/');
    const section = String(parts.shift() || '').toLowerCase();
    return { section, key: decodedRouteKey(parts) };
}

function renderEnemyTeamDetailLoading() {
    return `<div class="header-card"><h1>${escapeHtml(ui('enemyTeams', 'Enemy Teams'))}</h1><p>${escapeHtml(ui('loading', 'Loading...'))}</p></div>`;
}

function loadEnemyTeamDetail(key, fromRoute = false) {
    const team = enemyTeamByKey(key);
    if (!team) return;
    if (!fromRoute && navigateHash('enemyteams', key)) return;

    const name = typeof enemyTeamText === 'function' ? enemyTeamText(key) : key;
    const teamId = team[0];
    const teamCard = typeof renderEnemyTeam === 'function' ? renderEnemyTeam(team) : `<div>${escapeHtml(name)}</div>`;
    setActiveView('Monsters');
    document.getElementById('content').innerHTML = `<button class="back-btn" onclick="history.back()">← ${escapeHtml(ui('back', 'Back'))}</button><div class="detail-stack"><div class="card detail-title-card"><h3>${escapeHtml(name)}</h3></div><div class="card detail-section basic-info-card"><h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2><div class="info-list">${infoRow(ui('enemyTeam', 'Enemy Team'), escapeHtml(name))}${infoRow(ui('teamId', 'Team ID'), escapeHtml(teamId))}</div></div><div class="card detail-section"><h2>${escapeHtml(ui('members', 'Members'))}</h2><div class="enemy-team-grid">${teamCard}</div></div></div>`;
    window.scrollTo(0, 0);
}

function handleTileDataRoute() {
    const { section, key } = tileDataRouteInfo();

    if (section === 'tiles') {
        if (!wiki.tileDataReady) {
            setActiveView('TileData');
            document.getElementById('content').innerHTML = renderTileDataLoading();
            return true;
        }
        if (key && tileDataByKey(key)) loadTileDataDetail(key, true);
        else loadView('TileData', true);
        return true;
    }

    if (section === 'enemyteams') {
        if (!wiki.enemyTeamsReady) {
            setActiveView('Monsters');
            document.getElementById('content').innerHTML = renderEnemyTeamDetailLoading();
            return true;
        }
        if (key && enemyTeamByKey(key)) loadEnemyTeamDetail(key, true);
        else loadView('Monsters', true);
        return true;
    }

    return false;
}

handleHashRoute = function () {
    if (!wiki.ready) return;
    if (handleTileDataRoute()) return;
    baseHandleHashRouteForTileData();
};

loadView = function (view, fromRoute = false) {
    if (view !== 'TileData') return baseLoadViewForTileData(view, fromRoute);
    if (!fromRoute && navigateHash('tiles')) return;
    setActiveView('TileData');
    const content = document.getElementById('content');
    if (!wiki.tileDataReady) content.innerHTML = renderTileDataLoading();
    else {
        content.innerHTML = renderTileDataList();
        attachListSearch('.tile-data-card');
    }
    window.scrollTo(0, 0);
};

window.addEventListener('hashchange', handleHashRoute);

const tileDataPromise = (async () => {
    const manifest = await loadJson('data/tile-data.json', { parts: [], localisationParts: [] });
    const dataParts = await Promise.all((manifest.parts || []).map(path => loadJson(path, [])));
    wiki.tileData = dataParts.flat().filter(tile => Number.isFinite(Number(tile.ID))).sort((a, b) => Number(a.ID) - Number(b.ID));

    const localisationParts = await Promise.all((manifest.localisationParts || []).map(path => loadJson(path, {})));
    localisationParts.forEach(part => Object.entries(part).forEach(([key, value]) => wiki.tileDataLocalisation.set(key, value)));

    const dependencies = [];
    if (typeof itemDataPromise !== 'undefined') dependencies.push(itemDataPromise);
    if (typeof equipmentDataPromise !== 'undefined') dependencies.push(equipmentDataPromise);
    if (typeof chestDataPromise !== 'undefined') dependencies.push(chestDataPromise);
    if (typeof activeSkillDataPromise !== 'undefined') dependencies.push(activeSkillDataPromise);
    if (typeof passiveSkillDataPromise !== 'undefined') dependencies.push(passiveSkillDataPromise);
    if (typeof enemyTeamsDataPromise !== 'undefined') dependencies.push(enemyTeamsDataPromise);
    if (dependencies.length) await Promise.allSettled(dependencies);

    wiki.tileDataReady = true;
    if (wiki.ready && ['tiles', 'enemyteams'].includes(tileDataRouteInfo().section)) handleHashRoute();
})();

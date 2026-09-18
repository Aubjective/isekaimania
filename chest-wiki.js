// Chest wiki module. ChestKey is the stable route/reference key; localisation controls display text.
wiki.chests = [];
wiki.chestLocalisation = new Map();
wiki.chestsReady = false;

const baseHandleHashRouteForChests = handleHashRoute;
const baseLoadViewForChests = loadView;
window.removeEventListener('hashchange', baseHandleHashRouteForChests);

function chestLocaleRow(key) {
    return wiki.chestLocalisation.get(key) || {};
}

function chestText(key) {
    const row = chestLocaleRow(key).Name || {};
    return row[wiki.locale] || row.en || key;
}

function chestByKey(key) {
    return wiki.chests.find(chest => chest.ChestKey === key);
}

function renderChestImage(chest, name, detail = false) {
    const sprite = chest.ChestSprite;
    const sizeClass = detail ? 'entity-image-detail' : 'entity-image-list';
    const loading = detail ? 'eager' : 'lazy';
    return `<div class="entity-image-slot ${sizeClass}"><img src="chestsprite/${encodeURIComponent(sprite)}.png" alt="${escapeHtml(name)}" loading="${loading}" decoding="async" onerror="this.style.display='none'"></div>`;
}

function chestRewardLink(reward) {
    if (!reward || !reward.Key) return '';
    let reference = `<span>${escapeHtml(reward.Key)}</span>`;
    if (reward.Type === 'Item' && typeof itemByKey === 'function' && itemByKey(reward.Key)) reference = itemReferenceLink(reward.Key);
    else if (reward.Type === 'Equipment' && typeof equipmentByKey === 'function' && equipmentByKey(reward.Key)) reference = equipmentReferenceLink(reward.Key);
    const amount = Number(reward.Quantity);
    const quantity = Number.isFinite(amount) && amount > 1 ? `<span class="chest-reward-quantity">×${escapeHtml(amount)}</span>` : '';
    return `<span class="chest-reward-entry">${reference}${quantity}</span>`;
}

function renderChestRewardList(rewards) {
    const list = Array.isArray(rewards) ? rewards.filter(reward => reward && reward.Key) : [];
    return list.length ? list.map(chestRewardLink).join('<span class="chest-reward-separator"> · </span>') : escapeHtml(ui('none', 'None'));
}

function chestRandomCountText(randomCount = {}) {
    const min = Number(randomCount.Min);
    const max = Number(randomCount.Max);
    if (!Number.isFinite(min) && !Number.isFinite(max)) return '—';
    if (!Number.isFinite(max) || min === max) return String(Number.isFinite(min) ? min : max);
    if (!Number.isFinite(min)) return String(max);
    return `${min}–${max}`;
}

function renderChestLoot(chest) {
    const pools = Array.isArray(chest.LootPools) ? chest.LootPools : [];
    const order = ['Common', 'Rare', 'Epic', 'Legendary'];
    const rows = order.map(rarity => {
        const pool = pools.find(entry => entry.Rarity === rarity) || {};
        const chance = pool.ChancePercent ?? ({ Common: 40, Rare: 30, Epic: 20, Legendary: 10 }[rarity]);
        return `<div class="chest-loot-tier chest-loot-${rarity.toLowerCase()}"><div class="chest-loot-heading"><strong>${escapeHtml(rarity)} ${escapeHtml(chance)}%</strong></div><div class="chest-loot-rewards">${renderChestRewardList(pool.Rewards)}</div></div>`;
    }).join('');
    return `<div class="card detail-section chest-loot-card"><h2>${escapeHtml(ui('loot', 'Loot'))}</h2><p class="chest-loot-note">${escapeHtml(ui('chestLootNote', 'Random rewards are selected from the rarity pools below.'))}</p><div class="chest-loot-list">${rows}</div></div>`;
}

function chestSearchText(chest) {
    return [
        chest.ChestKey,
        chestText(chest.ChestKey),
        chest.Rarity,
        chest.ExpGain,
        chest.CoinsGain,
        chestRandomCountText(chest.RandomCount),
        ...(chest.FixedRewards || []).flatMap(reward => [reward.Type, reward.Key, reward.Quantity]),
        ...(chest.LootPools || []).flatMap(pool => [pool.Rarity, pool.ChancePercent, ...(pool.Rewards || []).flatMap(reward => [reward.Type, reward.Key, reward.Quantity])])
    ].filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
}

function renderChests() {
    const cards = wiki.chests.map(chest => {
        const key = chest.ChestKey;
        const name = chestText(key);
        const previewInfo = [
            infoRow(ui('chest', 'Chest'), escapeHtml(name), 'entity-primary-row'),
            infoRow(ui('rarity', 'Rarity'), escapeHtml(chest.Rarity || '')),
            infoRow(ui('randomCount', 'Random Count'), escapeHtml(chestRandomCountText(chest.RandomCount))),
            infoRow(ui('coinsGain', 'Coins Gain'), escapeHtml(chest.CoinsGain ?? 0))
        ].join('');
        return `<article class="card chest-card entity-list-card" data-key="${escapeHtml(key)}" data-search="${escapeHtml(chestSearchText(chest))}" onclick="loadChestDetail(this.dataset.key)">${renderChestImage(chest, name)}<div class="info-list list-info">${previewInfo}</div></article>`;
    }).join('');
    return `<div class="header-card"><h1>${escapeHtml(ui('chests', 'Chests'))}</h1><p><strong>${wiki.chests.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p><input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}"></div><div class="grid" id="chestGrid">${cards}</div>`;
}

function loadChestDetail(key, fromRoute = false) {
    const chest = chestByKey(key);
    if (!chest) return;
    if (!fromRoute && navigateHash('chests', key)) return;

    const name = chestText(key);
    const basicInfo = [
        infoRow(ui('chest', 'Chest'), escapeHtml(name)),
        infoRow(ui('rarity', 'Rarity'), escapeHtml(chest.Rarity || '')),
        infoRow(ui('expGain', 'EXP Gain'), escapeHtml(chest.ExpGain ?? 0)),
        infoRow(ui('coinsGain', 'Coins Gain'), escapeHtml(chest.CoinsGain ?? 0)),
        infoRow(ui('fixedItems', 'Fixed Items'), renderChestRewardList(chest.FixedRewards)),
        infoRow(ui('randomCount', 'Random Count'), escapeHtml(chestRandomCountText(chest.RandomCount)))
    ].join('');

    setActiveView('Chests');
    document.getElementById('content').innerHTML = `<button class="back-btn" onclick="loadView('Chests')">← ${escapeHtml(ui('back', 'Back'))}</button><div class="detail-stack"><div class="card detail-title-card chest-title-card">${renderChestImage(chest, name, true)}<h3>${escapeHtml(name)}</h3></div><div class="card detail-section basic-info-card"><h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2><div class="info-list">${basicInfo}</div></div>${renderChestLoot(chest)}</div>`;
    window.scrollTo(0, 0);
}

function renderChestLoading() {
    return `<div class="header-card"><h1>${escapeHtml(ui('chests', 'Chests'))}</h1><p>${escapeHtml(ui('loading', 'Loading...'))}</p></div>`;
}

function chestRouteInfo() {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    const parts = raw.split('/');
    const section = String(parts.shift() || '').toLowerCase();
    return { section, key: decodedRouteKey(parts) };
}

function handleChestRoute() {
    const { section, key } = chestRouteInfo();
    if (section !== 'chests') return false;
    if (!wiki.chestsReady) {
        setActiveView('Chests');
        document.getElementById('content').innerHTML = renderChestLoading();
        return true;
    }
    if (key && chestByKey(key)) loadChestDetail(key, true);
    else loadView('Chests', true);
    return true;
}

handleHashRoute = function () {
    if (!wiki.ready) return;
    if (handleChestRoute()) return;
    baseHandleHashRouteForChests();
};

loadView = function (view, fromRoute = false) {
    if (view !== 'Chests') return baseLoadViewForChests(view, fromRoute);
    if (!fromRoute && navigateHash('chests')) return;
    setActiveView('Chests');
    const content = document.getElementById('content');
    if (!wiki.chestsReady) content.innerHTML = renderChestLoading();
    else {
        content.innerHTML = renderChests();
        attachListSearch('.chest-card');
    }
    window.scrollTo(0, 0);
};

window.addEventListener('hashchange', handleHashRoute);

const chestDataPromise = (async () => {
    const manifest = await loadJson('data/chests.json', { parts: [], localisationParts: [] });
    const dataParts = await Promise.all((manifest.parts || []).map(path => loadJson(path, [])));
    wiki.chests = dataParts.flat().sort((a, b) => Number(a.ID) - Number(b.ID));

    const localisationParts = await Promise.all((manifest.localisationParts || []).map(path => loadJson(path, {})));
    localisationParts.forEach(part => Object.entries(part).forEach(([key, value]) => wiki.chestLocalisation.set(key, value)));
    wiki.chestsReady = true;

    if (wiki.ready && chestRouteInfo().section === 'chests') handleHashRoute();
})();
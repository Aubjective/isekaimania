// Item wiki module. ItemKey is the stable route/reference key; localisation controls display text.
wiki.items = [];
wiki.itemLocalisation = new Map();
wiki.itemsReady = false;

const baseHandleHashRouteForItems = handleHashRoute;
const baseLoadViewForItems = loadView;
window.removeEventListener('hashchange', baseHandleHashRouteForItems);

function itemLocaleRow(key) {
    return wiki.itemLocalisation.get(key) || {};
}

function itemText(key) {
    const row = itemLocaleRow(key).Name || {};
    return row[wiki.locale] || row.en || key;
}

function itemDescription(key) {
    const row = itemLocaleRow(key).Description || {};
    return row[wiki.locale] || row.en || '';
}

function itemByKey(key) {
    return wiki.items.find(item => item.ItemKey === key);
}

function renderItemImage(item, name, detail = false) {
    const key = item.SpriteKey || item.ItemKey;
    const sizeClass = detail ? 'entity-image-detail' : 'entity-image-list';
    const loading = detail ? 'eager' : 'lazy';
    return `<div class="entity-image-slot ${sizeClass}"><img src="itemsprite/${encodeURIComponent(key)}.png" alt="${escapeHtml(name)}" loading="${loading}" decoding="async" onerror="this.style.display='none'"></div>`;
}

function itemReferenceLink(key) {
    if (!key) return '';
    const name = itemText(key);
    const exists = !!itemByKey(key);
    if (!exists) return `<span>${escapeHtml(name)}</span>`;
    return `<span class="link item-link" data-item-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadItemDetail(this.dataset.itemKey)">${escapeHtml(name)}</span>`;
}

// Upgrade Monster loot item references to real Item routes once Items are loaded.
const baseFutureReferenceLinkForItems = futureReferenceLink;
futureReferenceLink = function (type, key) {
    if (type === 'item') return itemReferenceLink(key);
    return baseFutureReferenceLinkForItems(type, key);
};

function readableItemValue(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return String(value);
}

function renderItemUnit(unit) {
    const values = [unit.Action, unit.Value, unit.Multiplier, unit.Duration, unit.Target, unit.AreaOfEffect]
        .map(readableItemValue)
        .filter(value => value !== '');
    return values.length ? `<div class="item-unit-line">${values.map(value => escapeHtml(value)).join('<span class="item-unit-separator"> · </span>')}</div>` : '';
}

function renderItemDescription(item) {
    const description = itemDescription(item.ItemKey);
    const units = Array.isArray(item.Units) ? item.Units.map(renderItemUnit).filter(Boolean).join('') : '';
    return `<div class="card detail-section item-description-card"><h2>${escapeHtml(ui('description', 'Description'))}</h2>${description ? `<p class="item-description-text">${escapeHtml(description)}</p>` : ''}${units ? `<div class="item-unit-list">${units}</div>` : ''}</div>`;
}

function renderCraftedFrom(item) {
    const materials = Array.isArray(item.CraftMaterials) ? item.CraftMaterials : [];
    const content = materials.length
        ? materials.map(material => `<div class="item-craft-row">${itemReferenceLink(material.ItemKey)}${Number(material.Quantity) > 1 ? `<span class="item-craft-quantity">×${escapeHtml(material.Quantity)}</span>` : ''}</div>`).join('')
        : `<div class="item-none">${escapeHtml(ui('none', 'None'))}</div>`;
    return `<div class="card detail-section item-crafted-from"><h2>${escapeHtml(ui('craftedFrom', 'Crafted From'))}</h2><div class="item-craft-list">${content}</div></div>`;
}

function itemSearchText(item) {
    return [
        item.ItemKey,
        itemText(item.ItemKey),
        itemDescription(item.ItemKey),
        item.Rarity,
        item.Type,
        item.Price,
        item.UseAt,
        item.CraftType,
        ...(item.CraftMaterials || []).map(material => material.ItemKey),
        ...(item.Units || []).flatMap(unit => [unit.Action, unit.Value, unit.Multiplier, unit.Duration, unit.Target, unit.AreaOfEffect])
    ].filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
}

function renderItems() {
    const cards = wiki.items.map(item => {
        const key = item.ItemKey;
        const name = itemText(key);
        const previewInfo = [
            infoRow(ui('item', 'Item'), escapeHtml(name), 'entity-primary-row'),
            infoRow(ui('rarity', 'Rarity'), escapeHtml(item.Rarity || '')),
            infoRow(ui('type', 'Type'), escapeHtml(readableItemValue(item.Type))),
            infoRow(ui('price', 'Price'), escapeHtml(item.Price ?? ''))
        ].join('');
        return `<article class="card item-card entity-list-card" data-key="${escapeHtml(key)}" data-search="${escapeHtml(itemSearchText(item))}" onclick="loadItemDetail(this.dataset.key)">${renderItemImage(item, name)}<div class="info-list list-info">${previewInfo}</div></article>`;
    }).join('');
    return `<div class="header-card"><h1>${escapeHtml(ui('items', 'Items'))}</h1><p><strong>${wiki.items.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p><input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}"></div><div class="grid" id="itemGrid">${cards}</div>`;
}

function loadItemDetail(key, fromRoute = false) {
    const item = itemByKey(key);
    if (!item) return;
    if (!fromRoute && navigateHash('items', key)) return;

    const name = itemText(key);
    const basicInfo = [
        infoRow(ui('item', 'Item'), escapeHtml(name)),
        infoRow(ui('rarity', 'Rarity'), escapeHtml(item.Rarity || '')),
        infoRow(ui('type', 'Type'), escapeHtml(readableItemValue(item.Type))),
        infoRow(ui('price', 'Price'), escapeHtml(item.Price ?? '')),
        infoRow(ui('useAt', 'Use At'), escapeHtml(readableItemValue(item.UseAt) || '—')),
        infoRow(ui('craftType', 'Craft Type'), escapeHtml(item.CraftType && item.CraftType !== 'None' ? readableItemValue(item.CraftType) : '—'))
    ].join('');

    setActiveView('Items');
    document.getElementById('content').innerHTML = `<button class="back-btn" onclick="loadView('Items')">← ${escapeHtml(ui('back', 'Back'))}</button><div class="detail-stack"><div class="card detail-title-card item-title-card">${renderItemImage(item, name, true)}<h3>${escapeHtml(name)}</h3></div><div class="card detail-section basic-info-card"><h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2><div class="info-list">${basicInfo}</div></div>${renderItemDescription(item)}${renderCraftedFrom(item)}</div>`;
    window.scrollTo(0, 0);
}

function renderItemLoading() {
    return `<div class="header-card"><h1>${escapeHtml(ui('items', 'Items'))}</h1><p>${escapeHtml(ui('loading', 'Loading...'))}</p></div>`;
}

function itemRouteInfo() {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    const parts = raw.split('/');
    const section = String(parts.shift() || '').toLowerCase();
    return { section, key: decodedRouteKey(parts) };
}

function handleItemRoute() {
    const { section, key } = itemRouteInfo();
    if (section !== 'items') return false;
    if (!wiki.itemsReady) {
        setActiveView('Items');
        document.getElementById('content').innerHTML = renderItemLoading();
        return true;
    }
    if (key && itemByKey(key)) loadItemDetail(key, true);
    else loadView('Items', true);
    return true;
}

handleHashRoute = function () {
    if (!wiki.ready) return;
    if (handleItemRoute()) return;
    baseHandleHashRouteForItems();
};

loadView = function (view, fromRoute = false) {
    if (view !== 'Items') return baseLoadViewForItems(view, fromRoute);
    if (!fromRoute && navigateHash('items')) return;
    setActiveView('Items');
    const content = document.getElementById('content');
    if (!wiki.itemsReady) content.innerHTML = renderItemLoading();
    else {
        content.innerHTML = renderItems();
        attachListSearch('.item-card');
    }
    window.scrollTo(0, 0);
};

window.addEventListener('hashchange', handleHashRoute);

const itemDataPromise = (async () => {
    const manifest = await loadJson('data/items.json', { parts: [], localisationParts: [] });
    const dataParts = await Promise.all((manifest.parts || []).map(path => loadJson(path, [])));
    wiki.items = dataParts.flat().sort((a, b) => Number(a.ID) - Number(b.ID));

    const localisationParts = await Promise.all((manifest.localisationParts || []).map(path => loadJson(path, {})));
    localisationParts.forEach(part => Object.entries(part).forEach(([key, value]) => wiki.itemLocalisation.set(key, value)));
    wiki.itemsReady = true;

    if (wiki.ready && itemRouteInfo().section === 'items') handleHashRoute();
})();

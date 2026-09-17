// Equipment wiki module. EquipmentKey is the stable route/reference key; localisation controls display text.
wiki.equipments = [];
wiki.equipmentLocalisation = new Map();
wiki.equipmentsReady = false;

const baseHandleHashRouteForEquipments = handleHashRoute;
const baseLoadViewForEquipments = loadView;
window.removeEventListener('hashchange', baseHandleHashRouteForEquipments);

function equipmentLocaleRow(key) {
    return wiki.equipmentLocalisation.get(key) || {};
}

function equipmentText(key) {
    const row = equipmentLocaleRow(key).Name || {};
    return row[wiki.locale] || row.en || key;
}

function equipmentDescription(key) {
    const row = equipmentLocaleRow(key).Description || {};
    return row[wiki.locale] || row.en || '';
}

function equipmentByKey(key) {
    return wiki.equipments.find(equipment => equipment.EquipmentKey === key);
}

function renderEquipmentImage(equipment, name, detail = false) {
    const key = equipment.SpriteKey || equipment.EquipmentKey;
    const sizeClass = detail ? 'entity-image-detail' : 'entity-image-list';
    const loading = detail ? 'eager' : 'lazy';
    return `<div class="entity-image-slot ${sizeClass}"><img src="equipmentsprite/${encodeURIComponent(key)}.png" alt="${escapeHtml(name)}" loading="${loading}" decoding="async" onerror="this.style.display='none'"></div>`;
}

function equipmentReferenceLink(key) {
    if (!key) return '';
    const equipment = equipmentByKey(key);
    if (!equipment) return `<span>${escapeHtml(key)}</span>`;
    return `<span class="link equipment-link" data-equipment-key="${escapeHtml(key)}" onclick="event.stopPropagation(); loadEquipmentDetail(this.dataset.equipmentKey)">${escapeHtml(equipmentText(key))}</span>`;
}

// Upgrade Monster equipment loot references to real Equipment routes.
const baseFutureReferenceLinkForEquipments = futureReferenceLink;
futureReferenceLink = function (type, key) {
    if (type === 'equipment') return equipmentReferenceLink(key);
    return baseFutureReferenceLinkForEquipments(type, key);
};

function readableEquipmentValue(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return String(value);
}

function renderEquipmentUnit(unit) {
    const values = [unit.Action, unit.Value, unit.Amount]
        .map(readableEquipmentValue)
        .filter(value => value !== '');
    return values.length ? `<div class="equipment-unit-line">${values.map(value => escapeHtml(value)).join('<span class="equipment-unit-separator"> · </span>')}</div>` : '';
}

function renderEquipmentDescription(equipment) {
    const description = equipmentDescription(equipment.EquipmentKey);
    const units = Array.isArray(equipment.Units) ? equipment.Units.map(renderEquipmentUnit).filter(Boolean).join('') : '';
    return `<div class="card detail-section equipment-description-card"><h2>${escapeHtml(ui('description', 'Description'))}</h2>${description ? `<p class="equipment-description-text">${escapeHtml(description)}</p>` : ''}${units ? `<div class="equipment-unit-list">${units}</div>` : ''}</div>`;
}

function equipmentCraftReference(key) {
    if (equipmentByKey(key)) return equipmentReferenceLink(key);
    if (typeof itemByKey === 'function' && itemByKey(key)) return itemReferenceLink(key);
    return `<span class="equipment-unresolved-ref">${escapeHtml(key)}</span>`;
}

function equipmentCraftRow(key, quantity) {
    const amount = Number(quantity);
    const quantityText = Number.isFinite(amount) && amount > 1 ? `<span class="equipment-craft-quantity">×${escapeHtml(amount)}</span>` : '';
    return `<div class="equipment-craft-row">${equipmentCraftReference(key)}${quantityText}</div>`;
}

function renderEquipmentCraftedFrom(equipment) {
    const materials = Array.isArray(equipment.CraftMaterials) ? equipment.CraftMaterials : [];
    const content = materials.length
        ? materials.map(material => equipmentCraftRow(material.Key, material.Quantity)).join('')
        : `<div class="equipment-none">${escapeHtml(ui('none', 'None'))}</div>`;
    return `<div class="card detail-section"><h2>${escapeHtml(ui('craftedFrom', 'Crafted From'))}</h2><div class="equipment-craft-list">${content}</div></div>`;
}

function craftsIntoForEquipment(equipmentKey) {
    const results = [];
    wiki.equipments.forEach(candidate => {
        (candidate.CraftMaterials || []).forEach(material => {
            if (material.Key === equipmentKey) results.push({ EquipmentKey: candidate.EquipmentKey, Quantity: material.Quantity });
        });
    });
    return results;
}

function renderEquipmentCraftsInto(equipment) {
    const results = craftsIntoForEquipment(equipment.EquipmentKey);
    const content = results.length
        ? results.map(result => equipmentCraftRow(result.EquipmentKey, result.Quantity)).join('')
        : `<div class="equipment-none">${escapeHtml(ui('none', 'None'))}</div>`;
    return `<div class="card detail-section"><h2>${escapeHtml(ui('craftsInto', 'Crafts Into'))}</h2><div class="equipment-craft-list">${content}</div></div>`;
}

function equipmentSearchText(equipment) {
    return [equipment.EquipmentKey, equipmentText(equipment.EquipmentKey), equipmentDescription(equipment.EquipmentKey), equipment.Rarity, equipment.Type, equipment.MerchantCraftType, equipment.Element, equipment.Price,
        ...(equipment.CraftMaterials || []).map(material => material.Key),
        ...(equipment.Units || []).flatMap(unit => [unit.Action, unit.Value, unit.Amount])
    ].filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
}

function renderEquipments() {
    const cards = wiki.equipments.map(equipment => {
        const key = equipment.EquipmentKey;
        const name = equipmentText(key);
        const previewInfo = [
            infoRow(ui('equipment', 'Equipment'), escapeHtml(name), 'entity-primary-row'),
            infoRow(ui('rarity', 'Rarity'), escapeHtml(equipment.Rarity || '')),
            infoRow(ui('type', 'Type'), escapeHtml(readableEquipmentValue(equipment.Type))),
            infoRow(ui('element', 'Element'), escapeHtml(readableEquipmentValue(equipment.Element) || 'None'))
        ].join('');
        return `<article class="card equipment-card entity-list-card" data-key="${escapeHtml(key)}" data-search="${escapeHtml(equipmentSearchText(equipment))}" onclick="loadEquipmentDetail(this.dataset.key)">${renderEquipmentImage(equipment, name)}<div class="info-list list-info">${previewInfo}</div></article>`;
    }).join('');
    return `<div class="header-card"><h1>${escapeHtml(ui('equipments', 'Equipment'))}</h1><p><strong>${wiki.equipments.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p><input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}"></div><div class="grid" id="equipmentGrid">${cards}</div>`;
}

function loadEquipmentDetail(key, fromRoute = false) {
    const equipment = equipmentByKey(key);
    if (!equipment) return;
    if (!fromRoute && navigateHash('equipments', key)) return;

    const name = equipmentText(key);
    const basicInfo = [
        infoRow(ui('equipment', 'Equipment'), escapeHtml(name)),
        infoRow(ui('rarity', 'Rarity'), escapeHtml(equipment.Rarity || '')),
        infoRow(ui('type', 'Type'), escapeHtml(readableEquipmentValue(equipment.Type))),
        infoRow(ui('element', 'Element'), escapeHtml(readableEquipmentValue(equipment.Element) || 'None')),
        infoRow(ui('price', 'Price'), escapeHtml(equipment.Price ?? ''))
    ].join('');

    setActiveView('Equipments');
    document.getElementById('content').innerHTML = `<button class="back-btn" onclick="loadView('Equipments')">← ${escapeHtml(ui('back', 'Back'))}</button><div class="detail-stack"><div class="card detail-title-card equipment-title-card">${renderEquipmentImage(equipment, name, true)}<h3>${escapeHtml(name)}</h3></div><div class="card detail-section basic-info-card"><h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2><div class="info-list">${basicInfo}</div></div>${renderEquipmentDescription(equipment)}${renderEquipmentCraftedFrom(equipment)}${renderEquipmentCraftsInto(equipment)}</div>`;
    window.scrollTo(0, 0);
}

function renderEquipmentLoading() {
    return `<div class="header-card"><h1>${escapeHtml(ui('equipments', 'Equipment'))}</h1><p>${escapeHtml(ui('loading', 'Loading...'))}</p></div>`;
}

function equipmentRouteInfo() {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    const parts = raw.split('/');
    const section = String(parts.shift() || '').toLowerCase();
    return { section, key: decodedRouteKey(parts) };
}

function handleEquipmentRoute() {
    const { section, key } = equipmentRouteInfo();
    if (section !== 'equipments') return false;
    if (!wiki.equipmentsReady) {
        setActiveView('Equipments');
        document.getElementById('content').innerHTML = renderEquipmentLoading();
        return true;
    }
    if (key && equipmentByKey(key)) loadEquipmentDetail(key, true);
    else loadView('Equipments', true);
    return true;
}

handleHashRoute = function () {
    if (!wiki.ready) return;
    if (handleEquipmentRoute()) return;
    baseHandleHashRouteForEquipments();
};

loadView = function (view, fromRoute = false) {
    if (view !== 'Equipments') return baseLoadViewForEquipments(view, fromRoute);
    if (!fromRoute && navigateHash('equipments')) return;
    setActiveView('Equipments');
    const content = document.getElementById('content');
    if (!wiki.equipmentsReady) content.innerHTML = renderEquipmentLoading();
    else {
        content.innerHTML = renderEquipments();
        attachListSearch('.equipment-card');
    }
    window.scrollTo(0, 0);
};

window.addEventListener('hashchange', handleHashRoute);

const equipmentDataPromise = (async () => {
    const manifest = await loadJson('data/equipments.json', { parts: [], localisationParts: [] });
    const dataParts = await Promise.all((manifest.parts || []).map(path => loadJson(path, [])));
    wiki.equipments = dataParts.flat().sort((a, b) => Number(a.ID) - Number(b.ID));

    const localisationParts = await Promise.all((manifest.localisationParts || []).map(path => loadJson(path, {})));
    localisationParts.forEach(part => Object.entries(part).forEach(([key, value]) => wiki.equipmentLocalisation.set(key, value)));
    wiki.equipmentsReady = true;

    const route = equipmentRouteInfo();
    if (wiki.ready && route.section === 'equipments') handleHashRoute();
    if (wiki.ready && route.section === 'items' && route.key && typeof loadItemDetail === 'function') loadItemDetail(route.key, true);
})();

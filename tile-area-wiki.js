// Tile Area wiki module. Tile Area IDs are the stable route/reference key.
// Full source metadata is kept in data/tile-areas/*; the UI intentionally shows only ID, Location, Type and World Level plus the 12x12 map.
wiki.tileAreas = [];
wiki.tileAreaSprites = new Map();
wiki.tileAreasReady = false;

const baseHandleHashRouteForTileArea = handleHashRoute;
const baseLoadViewForTileArea = loadView;
window.removeEventListener('hashchange', baseHandleHashRouteForTileArea);

function tileAreaById(id) {
    const numericId = Number(id);
    return wiki.tileAreas.find(area => Number(area.ID) === numericId) || null;
}

function tileAreaValue(value) {
    return value === null || value === undefined || value === '' ? `<span class="tile-none">${escapeHtml(ui('none', 'None'))}</span>` : escapeHtml(value);
}

// Location codes stay in source data; display text comes from UI localisation.
const tileAreaLocationMeta = {
    U: ['tileAreaLocationUniversal', 'Universal', 'tileAreaLocationUniversalDescription', 'Can appear anywhere on the map.'],
    O: ['tileAreaLocationOuter', 'Outer', 'tileAreaLocationOuterDescription', 'Appears along the outside edge of the map.'],
    I: ['tileAreaLocationInner', 'Inner', 'tileAreaLocationInnerDescription', 'Appears in the inner area of the map.']
};
function tileAreaLocationText(code) {
    const meta = tileAreaLocationMeta[String(code || '').toUpperCase()];
    return meta ? ui(meta[0], meta[1]) : code;
}
function tileAreaLocationDisplay(code, detail = false) {
    if (code === null || code === undefined || code === '') return tileAreaValue(code);
    const meta = tileAreaLocationMeta[String(code).toUpperCase()];
    const name = escapeHtml(tileAreaLocationText(code));
    if (!detail || !meta) return name;
    const description = escapeHtml(ui(meta[2], meta[3]));
    return `<span class="tile-area-location-help"><button type="button" class="tile-area-location-trigger link" aria-expanded="false" onclick="event.stopPropagation();toggleTileAreaLocationHelp(this)">${name} <span aria-hidden="true">ⓘ</span></button><span class="tile-area-location-tooltip" role="status" hidden>${description}</span></span>`;
}
function toggleTileAreaLocationHelp(button) {
    const tooltip = button.nextElementSibling;
    const show = tooltip.hidden;
    document.querySelectorAll('.tile-area-location-tooltip').forEach(el => { el.hidden = true; el.previousElementSibling.setAttribute('aria-expanded', 'false'); });
    tooltip.hidden = !show;
    button.setAttribute('aria-expanded', String(show));
}

// TileData identity controls localisation/click-through. SpriteKey controls image and footprint.
function tileAreaSpriteMeta(tileKey) {
    const tile = typeof tileDataByKey === 'function' ? tileDataByKey(tileKey) : null;
    const spriteKey = tile && tile.SpriteKey ? tile.SpriteKey : tileKey;
    const meta = wiki.tileAreaSprites.get(spriteKey) || {};
    const width = Math.max(1, Number(meta.Width) || 1);
    const height = Math.max(1, Number(meta.Height) || 1);
    return {
        spriteKey,
        file: meta.File || `${spriteKey}.png`,
        width,
        height
    };
}

// A multi-cell footprint belongs to the reusable sprite, not the TileData display/name key.
function tileAreaFootprintFits(area, row, col, spriteKey, width, height) {
    if (row + height > 12 || col + width > 12) return false;
    const grid = Array.isArray(area.Grid) ? area.Grid : [];
    const keys = Array.isArray(area.Tiles) ? area.Tiles : [];

    for (let r = row; r < row + height; r += 1) {
        for (let c = col; c < col + width; c += 1) {
            if (!grid[r]) return false;
            const tileIndex = grid[r][c];
            const currentTileKey = tileIndex === null || tileIndex === undefined ? '' : keys[tileIndex] || '';
            if (!currentTileKey || tileAreaSpriteMeta(currentTileKey).spriteKey !== spriteKey) return false;
        }
    }
    return true;
}

function renderTileAreaMap(area) {
    const grid = Array.isArray(area.Grid) ? area.Grid : [];
    const covered = Array.from({ length: 12 }, () => Array(12).fill(false));
    const cells = [];

    for (let row = 0; row < 12; row += 1) {
        for (let col = 0; col < 12; col += 1) {
            if (covered[row][col]) continue;
            const tileIndex = grid[row] && grid[row][col] !== undefined ? grid[row][col] : null;
            const key = tileIndex === null || tileIndex === undefined ? '' : (area.Tiles || [])[tileIndex] || '';
            if (!key) continue;

            const meta = tileAreaSpriteMeta(key);
            const canSpan = tileAreaFootprintFits(area, row, col, meta.spriteKey, meta.width, meta.height);
            const width = canSpan ? meta.width : 1;
            const height = canSpan ? meta.height : 1;

            for (let r = row; r < row + height; r += 1) {
                for (let c = col; c < col + width; c += 1) covered[r][c] = true;
            }

            const tile = typeof tileDataByKey === 'function' ? tileDataByKey(key) : null;
            const name = typeof tileDataText === 'function' ? tileDataText(key) : key;
            const clickable = Boolean(tile);
            const click = clickable ? `onclick="loadTileDataDetail(this.dataset.tileDataKey)"` : '';
            const className = clickable ? 'tile-area-cell tile-area-cell-link' : 'tile-area-cell';
            cells.push(`<button type="button" class="${className}" data-tile-data-key="${escapeHtml(key)}" title="${escapeHtml(name)}" aria-label="${escapeHtml(name)}" style="grid-column:${col + 1} / span ${width};grid-row:${row + 1} / span ${height}" ${click}><span class="tile-area-fallback">${escapeHtml(name)}</span><img src="tiledatasprite/${encodeURIComponent(meta.file)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'"></button>`);
        }
    }

    return `<div class="tile-area-map-wrap"><div class="tile-area-map" role="grid" aria-label="${escapeHtml(ui('tileAreaMap', 'Tile Area Map'))}">${cells.join('')}</div></div>`;
}

// Lightweight, non-interactive card preview; uses the same sprite/footprint rules as the detail map.
function renderTileAreaPreview(area) {
    const grid = Array.isArray(area.Grid) ? area.Grid : [];
    const covered = Array.from({ length: 12 }, () => Array(12).fill(false));
    const cells = [];

    for (let row = 0; row < 12; row += 1) {
        for (let col = 0; col < 12; col += 1) {
            if (covered[row][col]) continue;
            const tileIndex = grid[row] && grid[row][col] !== undefined ? grid[row][col] : null;
            const key = tileIndex === null || tileIndex === undefined ? '' : (area.Tiles || [])[tileIndex] || '';
            if (!key) continue;

            const meta = tileAreaSpriteMeta(key);
            const canSpan = tileAreaFootprintFits(area, row, col, meta.spriteKey, meta.width, meta.height);
            const width = canSpan ? meta.width : 1;
            const height = canSpan ? meta.height : 1;
            for (let r = row; r < row + height; r += 1) {
                for (let c = col; c < col + width; c += 1) covered[r][c] = true;
            }
            cells.push(`<span class="tile-area-preview-cell" style="grid-column:${col + 1} / span ${width};grid-row:${row + 1} / span ${height}"><img src="tiledatasprite/${encodeURIComponent(meta.file)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'"></span>`);
        }
    }
    return `<div class="tile-area-preview" aria-hidden="true">${cells.join('')}</div>`;
}

function tileAreaSearchText(area) {
    return [area.ID, area.Location, tileAreaLocationText(area.Location), area.Type, area.WorldLevel].filter(value => value !== null && value !== undefined).join(' ').toLowerCase();
}

function renderTileAreaList() {
    const cards = wiki.tileAreas.map(area => {
        const id = Number(area.ID);
        const rows = [
            infoRow(ui('tileArea', 'Tile Area'), escapeHtml(id), 'entity-primary-row'),
            infoRow(ui('location', 'Location'), tileAreaLocationDisplay(area.Location)),
            infoRow(ui('type', 'Type'), tileAreaValue(area.Type)),
            infoRow(ui('worldLevel', 'World Level'), tileAreaValue(area.WorldLevel))
        ].join('');
        return `<article class="card tile-area-card entity-list-card" data-id="${id}" data-search="${escapeHtml(tileAreaSearchText(area))}" onclick="loadTileAreaDetail(this.dataset.id)"><div class="tile-area-card-preview">${renderTileAreaPreview(area)}</div><div class="info-list list-info">${rows}</div></article>`;
    }).join('');

    return `<div class="header-card"><h1>${escapeHtml(ui('tileAreas', 'Tile Areas'))}</h1><p><strong>${wiki.tileAreas.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p><input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}"></div><div class="grid" id="tileAreaGrid">${cards}</div>`;
}

function loadTileAreaDetail(id, fromRoute = false) {
    const area = tileAreaById(id);
    if (!area) return;
    if (!fromRoute && navigateHash('tileareas', String(area.ID))) return;

    const basicInfo = [
        infoRow(ui('tileArea', 'Tile Area'), escapeHtml(area.ID)),
        infoRow(ui('location', 'Location'), tileAreaLocationDisplay(area.Location, true)),
        infoRow(ui('type', 'Type'), tileAreaValue(area.Type)),
        infoRow(ui('worldLevel', 'World Level'), tileAreaValue(area.WorldLevel))
    ].join('');

    setActiveView('TileAreas');
    document.getElementById('content').innerHTML = `<button class="back-btn" onclick="loadView('TileAreas')">← ${escapeHtml(ui('back', 'Back'))}</button><div class="detail-stack"><div class="card detail-title-card"><h3>${escapeHtml(ui('tileArea', 'Tile Area'))}: ${escapeHtml(area.ID)}</h3></div><div class="card detail-section basic-info-card"><h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2><div class="info-list">${basicInfo}</div></div><div class="card detail-section tile-area-map-card"><h2>${escapeHtml(ui('map', 'Map'))}</h2>${renderTileAreaMap(area)}</div></div>`;
    window.scrollTo(0, 0);
}

function renderTileAreaLoading() {
    return `<div class="header-card"><h1>${escapeHtml(ui('tileAreas', 'Tile Areas'))}</h1><p>${escapeHtml(ui('loading', 'Loading...'))}</p></div>`;
}

function tileAreaRouteInfo() {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    const parts = raw.split('/');
    const section = String(parts.shift() || '').toLowerCase();
    return { section, key: decodedRouteKey(parts) };
}

function handleTileAreaRoute() {
    const { section, key } = tileAreaRouteInfo();
    if (section !== 'tileareas') return false;

    if (!wiki.tileAreasReady) {
        setActiveView('TileAreas');
        document.getElementById('content').innerHTML = renderTileAreaLoading();
        return true;
    }

    if (key && tileAreaById(key)) loadTileAreaDetail(key, true);
    else loadView('TileAreas', true);
    return true;
}

handleHashRoute = function () {
    if (!wiki.ready) return;
    if (handleTileAreaRoute()) return;
    baseHandleHashRouteForTileArea();
};

loadView = function (view, fromRoute = false) {
    if (view !== 'TileAreas') return baseLoadViewForTileArea(view, fromRoute);
    if (!fromRoute && navigateHash('tileareas')) return;
    setActiveView('TileAreas');
    const content = document.getElementById('content');
    if (!wiki.tileAreasReady) content.innerHTML = renderTileAreaLoading();
    else {
        content.innerHTML = renderTileAreaList();
        attachListSearch('.tile-area-card');
    }
    window.scrollTo(0, 0);
};

window.addEventListener('hashchange', handleHashRoute);

const tileAreaDataPromise = (async () => {
    const manifest = await loadJson('data/tile-areas.json', { parts: [] });
    const parts = await Promise.all((manifest.parts || []).map(path => loadJson(path, [])));
    wiki.tileAreas = parts.flat().filter(area => Number.isFinite(Number(area.ID))).sort((a, b) => Number(a.ID) - Number(b.ID));

    const spriteRows = await loadJson('data/tile-data-sprites.json', []);
    spriteRows.forEach(row => {
        if (row && row.SpriteKey) wiki.tileAreaSprites.set(row.SpriteKey, row);
    });

    if (typeof tileDataPromise !== 'undefined') await Promise.allSettled([tileDataPromise]);

    wiki.tileAreasReady = true;
    if (wiki.ready && tileAreaRouteInfo().section === 'tileareas') handleHashRoute();
})();

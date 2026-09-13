const wiki = {
    locale: window.ISEKAIMANIA_LOCALE || 'en',
    ui: {},
    home: {},
    characters: [],
    characterLocalisation: new Map()
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toggleMenu() {
    document.getElementById('main-nav').classList.toggle('open');
}

function setActiveView(view) {
    document.querySelectorAll('.menu-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });
    if (window.innerWidth <= 768) document.getElementById('main-nav').classList.remove('open');
}

function ui(key, fallback = '') {
    return wiki.ui[key] || fallback;
}

function characterText(key, field = 'Name') {
    const row = wiki.characterLocalisation.get(key);
    if (!row) return key;
    const localized = row[wiki.locale] || row.en || {};
    return localized[field] || (field === 'Name' ? key : '');
}

function traitLink(traitKey) {
    if (!traitKey) return '';
    return `<span class="link" data-trait-key="${escapeHtml(traitKey)}" title="${escapeHtml(ui('traitComingSoon', 'Trait details will be connected through localisation data.'))}">${escapeHtml(traitKey)}</span>`;
}

function renderHome() {
    const h = wiki.home;
    const features = Array.isArray(h.features) ? h.features.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '';
    return `
        <h1>🔥 ${escapeHtml(h.title || 'Isekaimania Wiki')}</h1>
        <section class="home-card card">
            <h2>${escapeHtml(h.aboutTitle || 'About this game')}</h2>
            <p class="home-lead"><strong>${escapeHtml(h.lead || '')}</strong></p>
            <p>${escapeHtml(h.intro || '')}</p>
            <h2>${escapeHtml(h.featureTitle || 'FEATURES')}</h2>
            <ul class="feature-list">${features}</ul>
            <p>${escapeHtml(h.adventure || '')}</p>
            <p>${escapeHtml(h.freeToPlay || '')}</p>
            <p class="home-closing"><strong>${escapeHtml(h.closing || '')}</strong></p>
        </section>`;
}

function renderCharacters() {
    if (!wiki.characters.length) {
        return `
            <div class="header-card"><h1>${escapeHtml(ui('characters', 'Characters'))}</h1></div>
            <div class="card empty-state">
                <p>${escapeHtml(ui('charactersEmpty', 'Character data will be added from Isekaimania Sheets.'))}</p>
                <p>${escapeHtml(ui('charactersReady', 'The page is already structured for localized names, stories, traits, and future sprite files.'))}</p>
            </div>`;
    }

    const cards = wiki.characters.map(character => {
        const key = character.CharacterKey;
        const name = characterText(key, 'Name');
        const traits = [character.TraitKey1, character.TraitKey2, character.TraitKey3].filter(Boolean);
        const traitHtml = traits.map(traitLink).join(' · ');
        const sprite = character.SpriteKey
            ? `<div class="character-sprite"><img src="sprites/${encodeURIComponent(character.SpriteKey)}.png" alt="${escapeHtml(name)}" onerror="this.parentElement.style.display='none'"></div>`
            : '';
        return `
            <article class="card character-card" data-key="${escapeHtml(key)}">
                ${sprite}
                <h2 class="character-name">${escapeHtml(name)}</h2>
                <div class="info-row"><div class="info-label">${escapeHtml(ui('gender', 'Gender'))}:</div><div>${escapeHtml(character.Gender || '')}</div></div>
                <div class="info-row"><div class="info-label">${escapeHtml(ui('faction', 'Faction'))}:</div><div>${escapeHtml(character.Faction || '')}</div></div>
                ${traitHtml ? `<div class="info-row"><div class="info-label">${escapeHtml(ui('traits', 'Traits'))}:</div><div>${traitHtml}</div></div>` : ''}
            </article>`;
    }).join('');

    return `
        <div class="header-card">
            <h1>${escapeHtml(ui('characters', 'Characters'))}</h1>
            <p><strong>${wiki.characters.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p>
        </div>
        <div class="grid">${cards}</div>`;
}

function loadView(view) {
    setActiveView(view);
    const content = document.getElementById('content');
    content.innerHTML = view === 'Characters' ? renderCharacters() : renderHome();
    window.scrollTo(0, 0);
}

async function loadJson(path, fallback) {
    try {
        const response = await fetch(path);
        if (!response.ok) return fallback;
        return await response.json();
    } catch (error) {
        console.error(`Failed to load ${path}`, error);
        return fallback;
    }
}

async function init() {
    const localeData = await loadJson('data/wiki_localisation.json', {});
    const current = localeData[wiki.locale] || localeData.en || {};
    wiki.ui = current.ui || {};
    wiki.home = current.home || {};

    wiki.characters = await loadJson('data/characters.json', []);
    const characterLoc = await loadJson('data/characters_localisation.json', []);
    characterLoc.forEach(row => {
        if (row.CharacterKey) wiki.characterLocalisation.set(row.CharacterKey, row);
    });

    document.querySelectorAll('[data-ui]').forEach(node => {
        const key = node.dataset.ui;
        node.textContent = ui(key, node.textContent);
    });

    loadView('Home');
}

document.addEventListener('click', event => {
    if (window.innerWidth > 768) return;
    const nav = document.getElementById('main-nav');
    const hamburger = document.querySelector('.hamburger');
    if (!nav.contains(event.target) && !hamburger.contains(event.target)) nav.classList.remove('open');
});

init();

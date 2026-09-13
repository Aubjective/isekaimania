const wiki = {
    locale: window.ISEKAIMANIA_LOCALE || 'en',
    ui: {},
    home: {},
    characters: [],
    characterLocalisation: new Map(),
    jobs: [],
    jobLocalisation: new Map(),
    currentView: 'Home'
};

const links = {
    discord: 'https://discord.gg/AKvAd3xpb'
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toggleMenu() {
    document.getElementById('main-nav').classList.toggle('open');
}

function setActiveView(view) {
    wiki.currentView = view;
    document.querySelectorAll('.menu-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });
    if (window.innerWidth <= 768) document.getElementById('main-nav').classList.remove('open');
}

function ui(key, fallback = '') {
    return wiki.ui[key] || fallback;
}

function infoRow(label, valueHtml, extraClass = '') {
    return `<div class="info-row ${extraClass}"><div class="info-label">${escapeHtml(label)}:</div><div class="info-value">${valueHtml}</div></div>`;
}

function characterLocale(key) {
    const row = wiki.characterLocalisation.get(key) || {};
    return row[wiki.locale] || row.en || {};
}

function characterText(key, field = 'Name') {
    const localized = characterLocale(key);
    return localized[field] || (field === 'Name' ? key : '');
}

function jobText(key) {
    const row = wiki.jobLocalisation.get(key) || {};
    return row[wiki.locale] || row.en || key;
}

function traitLink(traitKey) {
    if (!traitKey) return '';
    return `<span class="link trait-link" data-trait-key="${escapeHtml(traitKey)}" title="${escapeHtml(ui('traitComingSoon', 'Trait details will be connected through localisation data.'))}" onclick="event.stopPropagation()">${escapeHtml(traitKey)}</span>`;
}

function skillLink(skillKey) {
    if (!skillKey) return '';
    return `<span class="link skill-link" data-skill-key="${escapeHtml(skillKey)}" title="${escapeHtml(ui('skillComingSoon', 'Skill details will be connected when skill pages are added.'))}" onclick="event.stopPropagation()">${escapeHtml(skillKey)}</span>`;
}

function jobLink(jobKey) {
    if (!jobKey) return '';
    return `<span class="link job-link" data-job-key="${escapeHtml(jobKey)}" onclick="event.stopPropagation(); loadJobDetail(this.dataset.jobKey)">${escapeHtml(jobText(jobKey))}</span>`;
}

function renderTravelLevel(travel = {}) {
    const order = ['Land', 'Forest', 'Mountain', 'Sea', 'Hot', 'Cold'];
    return order
        .filter(key => travel[key] !== undefined)
        .map(key => `<span class="travel-ref" data-travel-key="${escapeHtml(key)}">${escapeHtml(key)}-${escapeHtml(travel[key])}</span>`)
        .join('<span class="travel-separator"> · </span>');
}

function renderCharacterImage(character, name, detail = false) {
    const key = character.SpriteKey || character.CharacterKey;
    const sizeClass = detail ? 'character-image-detail' : 'character-image-list';
    return `<div class="character-image-slot ${sizeClass}">
        <img src="sprites/${encodeURIComponent(key)}.png" alt="${escapeHtml(name)}" onerror="this.style.display='none'">
    </div>`;
}

function renderJobImage(job, name, detail = false) {
    const key = job.SpriteKey || job.JobKey;
    const sizeClass = detail ? 'job-image-detail' : 'job-image-list';
    return `<div class="job-image-slot ${sizeClass}">
        <img src="jobsprite/${encodeURIComponent(key)}.png" alt="${escapeHtml(name)}" onerror="this.style.display='none'">
    </div>`;
}

function rarityStars(rarity) {
    const count = Math.max(0, Number(rarity) || 0);
    return '⭐'.repeat(count);
}

function renderHome() {
    const h = wiki.home;
    const features = Array.isArray(h.features) ? h.features.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '';

    return `<h1>🌀 ${escapeHtml(h.title || 'Isekaimania - Overworld RPG')}</h1>
        <div class="home-card">
            <h2>${escapeHtml(h.aboutTitle || 'About this game')}</h2>
            <p><strong>${escapeHtml(h.lead || '')}</strong></p>
            <p>${escapeHtml(h.intro || '')}</p>
            <h3>${escapeHtml(h.featureTitle || 'Build your adventure your way:')}</h3>
            <ul class="feature-list">${features}</ul>
            <p>${escapeHtml(h.adventure || '')}</p>
            <p>${escapeHtml(h.freeToPlay || '')}</p>
            <p><strong>${escapeHtml(h.closing || '')}</strong></p>
            <p class="home-discord"><strong>${escapeHtml(h.joinDiscord || 'Join our Discord:')}</strong> <a href="${links.discord}" target="_blank" rel="noopener noreferrer">${links.discord}</a></p>
        </div>`;
}

function characterSearchText(character) {
    const key = character.CharacterKey;
    return [
        key,
        characterText(key, 'Name'),
        character.Gender,
        character.Faction,
        character.Role,
        character.TraitKey1,
        character.TraitKey2,
        character.TraitKey3,
        characterText(key, 'Time'),
        characterText(key, 'Background')
    ].filter(Boolean).join(' ').toLowerCase();
}

function renderCharacters() {
    const cards = wiki.characters.map(character => {
        const key = character.CharacterKey;
        const name = characterText(key, 'Name');
        const previewInfo = [
            infoRow(ui('character', 'Character'), escapeHtml(name), 'entity-primary-row'),
            infoRow(ui('gender', 'Gender'), escapeHtml(character.Gender || '')),
            infoRow(ui('faction', 'Faction'), escapeHtml(character.Faction || '')),
            infoRow(ui('role', 'Role'), escapeHtml(character.Role || ''))
        ].join('');
        return `<article class="card character-card entity-list-card" data-key="${escapeHtml(key)}" data-search="${escapeHtml(characterSearchText(character))}" onclick="loadCharacterDetail(this.dataset.key)">
            ${renderCharacterImage(character, name, false)}
            <div class="info-list list-info">${previewInfo}</div>
        </article>`;
    }).join('');

    return `<div class="header-card">
            <h1>${escapeHtml(ui('characters', 'Characters'))}</h1>
            <p><strong>${wiki.characters.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p>
            <input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}">
        </div>
        <div class="grid" id="characterGrid">${cards}</div>`;
}

function loadCharacterDetail(key) {
    const character = wiki.characters.find(item => item.CharacterKey === key);
    if (!character) return;

    const name = characterText(key, 'Name');
    const time = characterText(key, 'Time');
    const background = characterText(key, 'Background');
    const travel = renderTravelLevel(character.TravelLevel);

    const basicInfo = [
        infoRow(ui('character', 'Character'), escapeHtml(name)),
        infoRow(ui('gender', 'Gender'), escapeHtml(character.Gender || '')),
        infoRow(ui('faction', 'Faction'), escapeHtml(character.Faction || '')),
        infoRow(ui('role', 'Role'), escapeHtml(character.Role || '')),
        infoRow(ui('trait1', 'Trait 1'), traitLink(character.TraitKey1)),
        infoRow(ui('trait2', 'Trait 2'), traitLink(character.TraitKey2)),
        infoRow(ui('trait3', 'Trait 3'), traitLink(character.TraitKey3)),
        infoRow(ui('travelLevel', 'Travel Level'), travel)
    ].join('');

    const story = [time ? `<strong>${escapeHtml(time)}</strong>` : '', background ? escapeHtml(background) : '']
        .filter(Boolean)
        .join(' <span class="story-separator">·</span> ');

    document.getElementById('content').innerHTML = `
        <button class="back-btn" onclick="loadView('Characters')">← ${escapeHtml(ui('back', 'Back'))}</button>
        <div class="detail-stack">
            <div class="card detail-title-card">
                ${renderCharacterImage(character, name, true)}
                <h3>${escapeHtml(name)}</h3>
            </div>
            <div class="card detail-section basic-info-card">
                <h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2>
                <div class="info-list">${basicInfo}</div>
            </div>
            ${story ? `<div class="card story-card"><p>${story}</p></div>` : ''}
        </div>`;
    window.scrollTo(0, 0);
}

function jobSearchText(job) {
    return [
        job.JobKey,
        jobText(job.JobKey),
        job.Role,
        job.PassiveSkillKey,
        job.ActiveSkillKey,
        job.BoostType,
        ...(job.PrerequisiteJobs || [])
    ].filter(Boolean).join(' ').toLowerCase();
}

function renderJobs() {
    const cards = wiki.jobs.map(job => {
        const name = jobText(job.JobKey);
        const previewInfo = [
            infoRow(ui('job', 'Job'), escapeHtml(name), 'entity-primary-row'),
            infoRow(ui('rarity', 'Rarity'), escapeHtml(rarityStars(job.Rarity))),
            infoRow(ui('role', 'Role'), escapeHtml(job.Role || ''))
        ].join('');
        return `<article class="card job-card entity-list-card" data-key="${escapeHtml(job.JobKey)}" data-search="${escapeHtml(jobSearchText(job))}" onclick="loadJobDetail(this.dataset.key)">
            ${renderJobImage(job, name, false)}
            <div class="info-list list-info">${previewInfo}</div>
        </article>`;
    }).join('');

    return `<div class="header-card">
            <h1>${escapeHtml(ui('jobs', 'Jobs'))}</h1>
            <p><strong>${wiki.jobs.length} ${escapeHtml(ui('entries', 'entries'))}</strong></p>
            <input type="text" id="searchInput" class="search-input" placeholder="${escapeHtml(ui('search', 'Search...'))}" aria-label="${escapeHtml(ui('search', 'Search...'))}">
        </div>
        <div class="grid" id="jobGrid">${cards}</div>`;
}

function renderCraftRecipe(job) {
    const prereqs = Array.isArray(job.PrerequisiteJobs) ? job.PrerequisiteJobs.filter(Boolean) : [];
    if (!prereqs.length) return '';
    return `<div class="craft-row">${prereqs.map(jobLink).join('<span class="craft-plus">+</span>')}<span class="craft-arrow">→</span>${jobLink(job.JobKey)}</div>`;
}

function loadJobDetail(key) {
    const job = wiki.jobs.find(item => item.JobKey === key);
    if (!job) return;

    const name = jobText(key);
    const boostValue = job.BoostType
        ? `${escapeHtml(job.BoostType)}${job.Amount !== '' && job.Amount !== undefined ? ` <span class="boost-separator">·</span> ${escapeHtml(job.Amount)}` : ''}`
        : '';

    const basicInfo = [
        infoRow(ui('job', 'Job'), escapeHtml(name)),
        infoRow(ui('rarity', 'Rarity'), escapeHtml(rarityStars(job.Rarity))),
        infoRow(ui('role', 'Role'), escapeHtml(job.Role || '')),
        boostValue ? infoRow(ui('boostType', 'Boost Type'), boostValue) : ''
    ].join('');

    const moreInfo = [
        job.PassiveSkillKey ? infoRow(ui('passiveSkill', 'Passive Skill'), skillLink(job.PassiveSkillKey)) : '',
        job.ActiveSkillKey ? infoRow(ui('activeSkill', 'Active Skill'), skillLink(job.ActiveSkillKey)) : ''
    ].join('');

    const requiresRecipe = renderCraftRecipe(job);
    const craftsInto = wiki.jobs
        .filter(candidate => Array.isArray(candidate.PrerequisiteJobs) && candidate.PrerequisiteJobs.includes(key))
        .map(renderCraftRecipe)
        .filter(Boolean)
        .join('');

    document.getElementById('content').innerHTML = `
        <button class="back-btn" onclick="loadView('Jobs')">← ${escapeHtml(ui('back', 'Back'))}</button>
        <div class="detail-stack">
            <div class="card detail-title-card">
                ${renderJobImage(job, name, true)}
                <h3>${escapeHtml(name)}</h3>
            </div>
            <div class="card detail-section basic-info-card">
                <h2>${escapeHtml(ui('basicInfo', 'Basic Info'))}</h2>
                <div class="info-list">${basicInfo}</div>
            </div>
            ${moreInfo ? `<div class="card detail-section"><h2>${escapeHtml(ui('moreInfo', 'More Info'))}</h2><div class="info-list">${moreInfo}</div></div>` : ''}
            ${requiresRecipe ? `<div class="card detail-section"><h2>${escapeHtml(ui('requires', 'Requires'))}</h2><div class="craft-list">${requiresRecipe}</div></div>` : ''}
            ${craftsInto ? `<div class="card detail-section"><h2>${escapeHtml(ui('craftsInto', 'Crafts Into'))}</h2><div class="craft-list">${craftsInto}</div></div>` : ''}
        </div>`;
    window.scrollTo(0, 0);
}

function attachListSearch(cardSelector) {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', () => {
        const term = input.value.toLowerCase().trim();
        document.querySelectorAll(cardSelector).forEach(card => {
            card.style.display = !term || (card.dataset.search || '').includes(term) ? '' : 'none';
        });
    });
}

function loadView(view) {
    setActiveView(view);
    const content = document.getElementById('content');
    if (view === 'Characters') {
        content.innerHTML = renderCharacters();
        attachListSearch('.character-card');
    } else if (view === 'Jobs') {
        content.innerHTML = renderJobs();
        attachListSearch('.job-card');
    } else {
        content.innerHTML = renderHome();
    }
    window.scrollTo(0, 0);
}

function createWarpBurst(x, y) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const burst = document.createElement('span');
    burst.className = 'warp-burst';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;

    const ringInner = document.createElement('span');
    ringInner.className = 'warp-ring warp-ring-inner';
    const ringOuter = document.createElement('span');
    ringOuter.className = 'warp-ring warp-ring-outer';
    burst.append(ringInner, ringOuter);

    for (let i = 0; i < 6; i += 1) {
        const particle = document.createElement('span');
        particle.className = 'warp-particle';
        particle.style.setProperty('--warp-angle', `${i * 60}deg`);
        particle.style.setProperty('--warp-distance', `${26 + (i % 3) * 6}px`);
        particle.style.setProperty('--warp-delay', `${i * 12}ms`);
        burst.appendChild(particle);
    }

    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), 720);
}

function createGoldenTrail(x, y) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const particle = document.createElement('span');
    particle.className = 'golden-trail';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty('--trail-x', `${(Math.random() - 0.5) * 18}px`);
    particle.style.setProperty('--trail-y', `${-10 - Math.random() * 16}px`);
    document.body.appendChild(particle);
    window.setTimeout(() => particle.remove(), 680);
}

function activateCardWash(target) {
    const card = target instanceof Element ? target.closest('.card') : null;
    if (!card) return;
    card.classList.remove('is-warp-active');
    void card.offsetWidth;
    card.classList.add('is-warp-active');
    window.setTimeout(() => card.classList.remove('is-warp-active'), 850);
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
    const characterLoc = await loadJson('data/characters_localisation.json', {});
    Object.entries(characterLoc).forEach(([key, value]) => wiki.characterLocalisation.set(key, value));

    wiki.jobs = await loadJson('data/jobs.json', []);
    const jobLoc = await loadJson('data/jobs_localisation.json', {});
    Object.entries(jobLoc).forEach(([key, value]) => wiki.jobLocalisation.set(key, value));

    document.querySelectorAll('[data-ui]').forEach(node => {
        const key = node.dataset.ui;
        node.textContent = ui(key, node.textContent);
    });

    loadView('Home');
}

let lastGoldenTrailAt = 0;
document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !event.isPrimary) return;
    const now = performance.now();
    if (now - lastGoldenTrailAt < 34) return;
    lastGoldenTrailAt = now;
    createGoldenTrail(event.clientX, event.clientY);
}, { passive: true });

document.addEventListener('pointerdown', event => {
    if (!event.isPrimary) return;
    createWarpBurst(event.clientX, event.clientY);
    activateCardWash(event.target);
}, { passive: true });

document.addEventListener('click', event => {
    if (window.innerWidth > 768) return;
    const nav = document.getElementById('main-nav');
    const hamburger = document.querySelector('.hamburger');
    if (!nav.contains(event.target) && !hamburger.contains(event.target)) nav.classList.remove('open');
});

init();

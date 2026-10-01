// History-aware routing helper. Mirrors Jobmania's Back behavior while preserving Isekaimania's existing hash routes.
(function () {
    'use strict';

    const fallbackViews = new Map([
        ['characters', 'Characters'],
        ['jobs', 'Jobs'],
        ['monsters', 'Monsters'],
        ['active-skills', 'ActiveSkills'],
        ['passive-skills', 'PassiveSkills'],
        ['items', 'Items'],
        ['equipments', 'Equipments'],
        ['chests', 'Chests'],
        ['tiles', 'TileData'],
        ['tileareas', 'TileAreas'],
        ['enemyteams', 'Monsters']
    ]);

    function currentSection() {
        const raw = String(window.location.hash || '').replace(/^#\/?/, '').trim();
        return String(raw.split('/')[0] || 'home').toLowerCase();
    }

    function stateDepth() {
        return Number(history.state?.isekaimaniaDepth || 0);
    }

    // Mark the page the visitor arrived on as depth 0. This gives direct deep links
    // a safe in-wiki fallback instead of sending the visitor outside the wiki.
    history.replaceState({
        ...(history.state || {}),
        isekaimaniaRoute: true,
        isekaimaniaDepth: stateDepth()
    }, '', window.location.href);

    // Replace the core hash assignment with the same pushState-style route depth
    // tracking used by Jobmania. Existing route handlers still do the rendering.
    navigateHash = function (section, key = '') {
        const target = routeHash(section, key);
        if (window.location.hash === target) return false;

        history.pushState({
            ...(history.state || {}),
            isekaimaniaRoute: true,
            isekaimaniaDepth: stateDepth() + 1
        }, '', target);

        if (typeof handleHashRoute === 'function') handleHashRoute();
        return true;
    };
    window.navigateHash = navigateHash;

    window.goBackToPreviousDetail = function () {
        if (stateDepth() > 0) {
            history.back();
            return;
        }

        const fallback = fallbackViews.get(currentSection()) || 'Home';
        loadView(fallback);
    };

    // Existing modules already render a .back-btn with category-specific inline
    // actions. Intercept those buttons so every detail page gets one consistent
    // history-aware Back behavior without duplicating routing logic in each module.
    document.addEventListener('click', event => {
        const button = event.target.closest('.back-btn');
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        window.goBackToPreviousDetail();
    }, true);
})();

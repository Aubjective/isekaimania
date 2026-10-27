// Combined wiki catalogue for Special Events and grade-based Guild Quests.
// Reuses the existing card classes and detail routes. Does not change source content.
const questsPreviousRoute = handleHashRoute;
const questsPreviousView = loadView;
window.removeEventListener('hashchange', questsPreviousRoute);

function renderQuestsList() {
    const events=(wiki.specialEventGroups||[]).map(g=>wikiQuestCard(g,'events')).join('');
    const guild=(wiki.missionGroups||[]).map(g=>wikiQuestCard(g,'guild')).join('');
    const other=(wiki.otherEventGroups||[]).map(otherEventCard).join('');
    const sections = [
        events ? '<section id="quest-events" class="quest-catalogue-section"><h2>' + escapeHtml(ui('events','Events')) + '</h2><div class="grid quest-catalogue-grid">' + events + '</div></section>' : '',
        other ? '<section id="quest-other" class="quest-catalogue-section"><h2>' + escapeHtml(otherLabel('section')) + '</h2><div class="grid quest-catalogue-grid">' + other + '</div></section>' : '',
        guild ? '<section id="quest-guild" class="quest-catalogue-section"><h2>' + escapeHtml(ui('guildQuests','Guild Quests')) + '</h2><div class="grid quest-catalogue-grid">' + guild + '</div></section>' : ''
    ].filter(Boolean).join('');
    const total = (wiki.specialEventGroups || []).length + (wiki.missionGroups || []).length + (wiki.otherEventGroups || []).length;

    return '<div class="header-card"><h1>' + escapeHtml(ui('quests','Quests')) + '</h1><p>' + total + ' ' + escapeHtml(ui('entries','entries')) + '</p>' + '<input type="text" id="searchInput" class="search-input" placeholder="' + escapeHtml(ui('search','Search...')) + '"></div><div class="quest-catalogue">' + sections + '</div>';
}
function questsCatalogueSearch() {
    const search = document.getElementById('searchInput');
    if (!search) return;
    search.addEventListener('input', () => {
        const term = search.value.toLowerCase().trim();
        document.querySelectorAll('.quest-catalogue-section').forEach(section => {
            let shown = 0;
            section.querySelectorAll('.quest-catalogue-card').forEach(card => {
                const visible = !term || (card.dataset.search || '').includes(term);
                card.style.display = visible ? '' : 'none';
                if (visible) shown++;
            });
            section.hidden = !shown;
        });
    });
}
function questsCatalogueRoute() {
    const parts = window.location.hash.replace(/^#\/?/, '').split('/');
    const section = (parts[0] || '').toLowerCase();
    if (section === 'quests' || ((section === 'specialevents' || section === 'missions') && !parts[1])) {
        loadView('Quests', true);
        return true;
    }
    return false;
}
handleHashRoute = function() {
    if (!wiki.ready) return;
    if (questsCatalogueRoute()) return;
    questsPreviousRoute();
};
loadView = function(view, fromRoute = false) {
    if (view !== 'Quests' && view !== 'SpecialEvents' && view !== 'Missions')
        return questsPreviousView(view, fromRoute);
    if (!fromRoute && navigateHash('quests')) return;
    setActiveView('Quests');
    const ready = wiki.specialEventsReady && wiki.missionsReady && wiki.otherEventsReady;
    document.getElementById('content').innerHTML = ready
        ? renderQuestsList()
        : '<h2>' + escapeHtml(ui('loading','Loading...')) + '</h2>';
    if (ready) questsCatalogueSearch();
    window.scrollTo(0,0);
};
window.addEventListener('hashchange', handleHashRoute);
Promise.allSettled([specialEventPromise, missionPromise, otherEventPromise]).then(() => {
    if (wiki.ready && ['quests', 'specialevents', 'missions'].includes(window.location.hash.replace(/^#\/?/, '').split('/')[0].toLowerCase()))
        handleHashRoute();
});

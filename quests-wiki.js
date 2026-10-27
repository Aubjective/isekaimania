// Combined wiki catalogue for Special Events and grade-based Guild Quests.
// Reuses the existing card classes and detail routes. Does not change source content.
const questsPreviousRoute = handleHashRoute;
const questsPreviousView = loadView;
window.removeEventListener('hashchange', questsPreviousRoute);

function renderQuestsList() {
    const events = (wiki.specialEventGroups || []).map(group => {
        const name = specialEventText(group.key) || group.key.replace(/([a-z])([A-Z])/g, '$1 $2');
        const stages = specialEventStageOrder(group).filter(stage => !stage.display || stage.display.show !== false).length;
        return '<article class="card entity-list-card main-quest-list-card quest-catalogue-card" data-search="' + escapeHtml(name.toLowerCase()) + '" data-key="' + escapeHtml(group.key) + '" onclick="loadSpecialEventDetail(this.dataset.key)"><h3>' + escapeHtml(name) + '</h3><p>' + stages + ' ' + escapeHtml(ui('stages','Stages')) + '</p></article>';
    }).join('');
    const guild = (wiki.missionGroups || []).map(group => {
        const name = missionText(group.key) || missionText(group.quest?.key) || group.key.replace(/([a-z])([A-Z])/g, '$1 $2');
        const grade = String(group.grade || '').replace(/Grade$/, '');
        return '<article class="card entity-list-card main-quest-list-card quest-catalogue-card" data-grade="' + escapeHtml(grade) + '" data-search="' + escapeHtml((name + ' ' + grade).toLowerCase()) + '" data-key="' + escapeHtml(group.key) + '" onclick="loadMissionDetail(this.dataset.key)"><h3>' + escapeHtml(name) + '</h3><p>' + escapeHtml(ui('grade','Grade')) + ': ' + escapeHtml(grade) + '</p></article>';
    }).join('');
    const sections = [
        events ? '<section class="quest-catalogue-section"><h2>' + escapeHtml(ui('events','Events')) + '</h2><div class="grid quest-catalogue-grid">' + events + '</div></section>' : '',
        guild ? '<section class="quest-catalogue-section"><h2>' + escapeHtml(ui('guildQuests','Guild Quests')) + '</h2><div class="grid quest-catalogue-grid">' + guild + '</div></section>' : ''
    ].filter(Boolean).join('');
    const total = (wiki.specialEventGroups || []).length + (wiki.missionGroups || []).length;
    return '<div class="header-card"><h1>' + escapeHtml(ui('quests','Quests')) + '</h1><p>' + total + ' ' + escapeHtml(ui('entries','entries')) + '</p><input type="text" id="searchInput" class="search-input" placeholder="' + escapeHtml(ui('search','Search...')) + '"></div><div class="quest-catalogue">' + sections + '</div>';
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
    const ready = wiki.specialEventsReady && wiki.missionsReady;
    document.getElementById('content').innerHTML = ready
        ? renderQuestsList()
        : '<h2>' + escapeHtml(ui('loading','Loading...')) + '</h2>';
    if (ready) questsCatalogueSearch();
    window.scrollTo(0,0);
};
window.addEventListener('hashchange', handleHashRoute);
Promise.allSettled([specialEventPromise, missionPromise]).then(() => {
    if (wiki.ready && ['quests', 'specialevents', 'missions'].includes(window.location.hash.replace(/^#\/?/, '').split('/')[0].toLowerCase()))
        handleHashRoute();
});

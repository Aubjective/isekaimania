// Mission wiki: one mission per grade quest, using the same detail presentation as Special Events.
wiki.missionGroups = [];
wiki.missionLocalisation = {};
wiki.missionsReady = false;
const missionPreviousRoute = handleHashRoute;
const missionPreviousView = loadView;
window.removeEventListener('hashchange', missionPreviousRoute);

function missionText(key) {
    const row = wiki.missionLocalisation[key] || {};
    return row[wiki.locale] || row.en || '';
}
function renderMissionList(){return '<div class="header-card"><h1>'+escapeHtml(ui('guildQuests','Guild Quests'))+'</h1></div><div class="grid">'+wiki.missionGroups.map(g=>wikiQuestCard(g,'guild')).join('')+'</div>';}
function loadMissionDetail(key,fromRoute=false){
    const group=wiki.missionGroups.find(g=>g.key===key);if(!group)return;
    if(!fromRoute&&navigateHash('missions',key))return;
    setActiveView('Missions');
    document.getElementById('content').innerHTML='<button class="back-btn" onclick="loadView(\'Quests\')">← '+escapeHtml(ui('back','Back'))+'</button><div class="detail-stack">'+wikiQuestDetail(group,'guild')+'</div>';
    window.scrollTo(0,0);
}
function missionRoute() {
    const parts = window.location.hash.replace(/^#\/?/,'').split('/');
    if (parts[0].toLowerCase() !== 'missions') return false;
    setActiveView('Missions');
    if (!wiki.missionsReady) {
        document.getElementById('content').innerHTML = '<h2>'+escapeHtml(ui('loading','Loading...'))+'</h2>';
        return true;
    }
    if (parts[1]) loadMissionDetail(decodeURIComponent(parts[1]),true);
    else loadView('Missions',true);
    return true;
}
handleHashRoute = function(){if (!wiki.ready) return; if (missionRoute()) return; missionPreviousRoute();};
loadView = function(view,fromRoute=false) {
    if (view !== 'Missions') return missionPreviousView(view,fromRoute);
    if (!fromRoute && navigateHash('missions')) return;
    setActiveView('Missions');
    document.getElementById('content').innerHTML = wiki.missionsReady ? renderMissionList() : '<h2>'+escapeHtml(ui('loading','Loading...'))+'</h2>';
    document.getElementById('missionGradeFilter')?.addEventListener('change',missionFilter);
    window.scrollTo(0,0);
};
window.addEventListener('hashchange',handleHashRoute);
const missionPromise = (async()=>{
    const [data,localisation] = await Promise.all([
        loadJson('data/guild-quests.json',{groups:[]}),
        loadJson('data/mission-localisation.json',{})
    ]);
    wiki.missionGroups = data.groups || [];
    wiki.missionLocalisation = localisation;
    await Promise.allSettled([typeof specialEventPromise !== 'undefined' ? specialEventPromise : Promise.resolve()]);
    wiki.missionsReady = true;
    if (wiki.ready && window.location.hash.toLowerCase().startsWith('#/missions')) handleHashRoute();
})();

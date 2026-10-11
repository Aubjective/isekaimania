// Additive Main Quest module. Other wiki modules and routes remain untouched.
wiki.mainQuestGroups = [];
wiki.mainQuestLocalisation = {};
wiki.mainQuestReady = false;
const mainQuestPreviousRoute = handleHashRoute;
const mainQuestPreviousView = loadView;
window.removeEventListener('hashchange', mainQuestPreviousRoute);

function mainQuestName(key) {
    const row = wiki.mainQuestLocalisation[key] || {};
    return row[wiki.locale] || row.en || '';
}
function mainQuestGroup(key) { return wiki.mainQuestGroups.find(group => group.key === key); }
function mainQuestByKey(key) {
    for (const group of wiki.mainQuestGroups) {
        const quest = (group.quests || []).find(q => q.key === key);
        if (quest) return {group, quest};
    }
    return null;
}
function mainQuestReference(key) {
    if (!key) return '';
    const label = mainQuestName(key);
    const quest = mainQuestByKey(key);
    if (quest) return '<a href="' + routeHash('mainquests',quest.group.key) + '/' + encodeURIComponent(key) + '">' + escapeHtml(label || ui('quest','Quest')) + '</a>';
    const group = mainQuestGroup(key);
    if (group) return '<a href="' + routeHash('mainquests',key) + '">' + escapeHtml(label || ui('mainQuests','Main Quests')) + '</a>';
    if (typeof tileDataByKey === 'function' && tileDataByKey(key)) return tileDataReferenceLink(key);
    if (typeof monsterText === 'function' && Array.isArray(wiki.monsters) && wiki.monsters.some(m=>m.MonsterKey===key)) return '<a href="' + routeHash('monsters',key) + '">' + escapeHtml(monsterText(key)) + '</a>';
    if (typeof equipmentByKey === 'function' && equipmentByKey(key)) return equipmentReferenceLink(key);
    if (typeof itemByKey === 'function' && itemByKey(key)) return itemReferenceLink(key);
    if (typeof chestByKey === 'function' && chestByKey(key)) return '<a href="' + routeHash('chests',key) + '">' + escapeHtml(chestText(key)) + '</a>';
    if (typeof tileAreaById === 'function' && /^\d+$/.test(String(key)) && tileAreaById(key)) return '<a href="' + routeHash('tileareas',key) + '">' + escapeHtml(ui('tileArea','Tile Area') + ' ' + key) + '</a>';
    return escapeHtml(mainQuestName(key) || String(key).replace(/([a-z])([A-Z])/g, '$1 $2'));
}
function mainQuestTokens(value) {
    if (value === null || value === undefined || value === '') return '';
    return String(value).split('|').map(token => {
        // Internal encounter-history checks are retained in source JSON, never shown to players.
        if (/^EncounteredBefore(?:-|$)/i.test(token.trim())) return '';
        const parts = token.split('-'), action = parts.shift();
        const templates = wiki.mainQuestLocalisation[action] || {};
        const template = templates[wiki.locale] || templates.en || '';
        if (template && /\{\d+\}/.test(template)) {
            return template.replace(/\{(\d+)\}/g, (_, i) => mainQuestReference(parts[Number(i)] || ''));
        }
        if (/^(GainEXP|GainCoin)$/.test(action)) return escapeHtml((action==='GainEXP'?'EXP':'Coins') + ': ' + Number(parts[0]||0).toLocaleString());
        if (/^(GainEquipment|GainItem|GainChest|ReceiveQuest|CompleteQuest|HaveItem|HaveEquipment|DefeatDungeonArena|EnteredTileArea|EngagedTileData)$/.test(action)) {
            const quantity = /^(GainEquipment|GainItem|GainChest|HaveItem|HaveEquipment)$/.test(action) ? parts.pop() : null;
            return escapeHtml(action.replace(/([a-z])([A-Z])/g,'$1 $2')) + ': ' + mainQuestReference(parts.join('-')) + (quantity ? ' ×' + escapeHtml(quantity) : '');
        }
        return escapeHtml(action.replace(/([a-z])([A-Z])/g,'$1 $2')) + (parts.length ? ': ' + parts.map(mainQuestReference).join(' · ') : '');
    }).filter(Boolean).join('<span class="main-quest-separator"> · </span>');
}
function mainQuestImage(quest) {
    const key = quest.mainQuestImage, type = String(quest.mainQuestImageType||'').toLowerCase();
    if (!key) return '';
    const folder = {monster:'monstersprite',item:'itemsprite',equipment:'equipmentsprite',chest:'chestsprite'}[type];
    if (!folder) return '';
    const label = mainQuestReference(key);
    return '<div class="main-quest-image"><img src="' + folder + '/' + encodeURIComponent(key) + '.png" alt="" loading="lazy" onerror="this.style.display=\'none\'">' + label + '</div>';
}
function mainQuestGroupSprite(group, detail = false) {
    const quests = (group.quests || []).slice().sort((a,b) => Number(a.questorder)-Number(b.questorder));
    const quest = quests.find(q => q.mainQuestImage && q.mainQuestImageType);
    if (!quest) return '';
    const type = String(quest.mainQuestImageType).toLowerCase();
    const folder = {monster:'monstersprite',item:'itemsprite',equipment:'equipmentsprite',chest:'chestsprite'}[type];
    if (!folder) return '';
    const key = quest.mainQuestImage;
    const record = type === 'monster' && Array.isArray(wiki.monsters) ? wiki.monsters.find(m => m.MonsterKey === key) :
        type === 'item' && typeof itemByKey === 'function' ? itemByKey(key) :
        type === 'equipment' && typeof equipmentByKey === 'function' ? equipmentByKey(key) :
        type === 'chest' && typeof chestByKey === 'function' ? chestByKey(key) : null;
    const sprite = record && record.SpriteKey ? record.SpriteKey : key;
    return '<div class="main-quest-hero-image ' + (detail ? 'main-quest-hero-detail' : 'main-quest-hero-list') + '"><img src="' + folder + '/' + encodeURIComponent(sprite) + '.png" alt="" loading="lazy" onerror="this.style.display=\'none\'"></div>';
}
function mainQuestQuestCard(q) {
    const title = mainQuestName(q.key) || ui('quest','Quest');
    const info = [
        q.mapGradeLimitation ? infoRow(ui('mapGradeLimitation','Map Grade Limitation'),escapeHtml(q.mapGradeLimitation)) : '',
        q.mainQuestRequireMapArea ? infoRow(ui('mainQuestRequireMapArea','Required Map Areas'),String(q.mainQuestRequireMapArea).split('-').map(mainQuestReference).join(' · ')) : '',
        q.mapSizeAvailable ? infoRow(ui('mapSizeAvailable','Map Size Available'),escapeHtml(q.mapSizeAvailable)) : '',
        q.getFragment ? infoRow(ui('getFragment','Get Fragment'),mainQuestTokens(q.getFragment)) : ''
    ].filter(Boolean).join('');
    const description = mainQuestName(q.extraDescr);
    const variables = String(q.extraDescrVariables || '').split('-');
    const localizedDescription = description.replace(/\{(\d+)\}/g, (match, index) => {
        const value = variables[Number(index)];
        if (value === undefined) return escapeHtml(ui('unknown', 'Unknown'));
        return mainQuestReference(value);
    });
    return '<article class="card detail-section main-quest-entry" id="quest-' + encodeURIComponent(q.key) + '"><h2>' + escapeHtml(ui('quest','Quest')) + ' ' + escapeHtml(q.questorder) + ': ' + escapeHtml(title) + '</h2>' + (info ? '<h3>' + escapeHtml(ui('basicInfo','Basic Info')) + '</h3><div class="info-list">' + info + '</div>' : '') + (description ? '<h3>' + escapeHtml(ui('description','Description')) + '</h3><p>' + localizedDescription + '</p>' : '') + (q.completeCondition ? '<h3>' + escapeHtml(ui('completeCondition','Completion Requirements')) + '</h3><div>' + mainQuestTokens(q.completeCondition) + '</div>' : '') + (q.completeOutcome ? '<h3>' + escapeHtml(ui('completeOutcome','Completion Outcome')) + '</h3><div>' + mainQuestTokens(q.completeOutcome) + '</div>' : '') + '</article>';
}
function renderMainQuestList() {
    const cards = wiki.mainQuestGroups.map(g => '<article class="card entity-list-card main-quest-list-card" data-search="' + escapeHtml(mainQuestName(g.key).toLowerCase()) + '" onclick="loadMainQuestDetail(this.dataset.key)" data-key="' + escapeHtml(g.key) + '">' + mainQuestGroupSprite(g) + '<h3>' + escapeHtml(mainQuestName(g.key) || ui('mainQuests','Main Quests')) + '</h3><p>' + escapeHtml(g.questCount) + ' ' + escapeHtml(ui('quests','Quests')) + '</p></article>').join('');
    return '<div class="header-card"><h1>' + escapeHtml(ui('mainQuests','Main Quests')) + '</h1><p>' + wiki.mainQuestGroups.length + ' ' + escapeHtml(ui('entries','entries')) + '</p><input type="text" id="searchInput" class="search-input" placeholder="' + escapeHtml(ui('search','Search...')) + '"></div><div class="grid">' + cards + '</div>';
}
function loadMainQuestDetail(key, fromRoute=false, questKey='') {
    const group = mainQuestGroup(key);
    if (!group) return;
    if (!fromRoute && navigateHash('mainquests',key)) return;
    setActiveView('MainQuests');
    document.getElementById('content').innerHTML = '<button class="back-btn" onclick="loadView(\'MainQuests\')">← ' + escapeHtml(ui('back','Back')) + '</button><div class="detail-stack"><div class="card detail-title-card main-quest-title-card">' + mainQuestGroupSprite(group,true) + '<h2>' + escapeHtml(mainQuestName(key) || ui('mainQuests','Main Quests')) + '</h2><p>' + group.quests.length + ' ' + escapeHtml(ui('quests','Quests')) + '</p></div>' + group.quests.slice().sort((a,b)=>Number(a.questorder)-Number(b.questorder)).map(mainQuestQuestCard).join('') + '</div>';
    if (questKey) { const node=document.getElementById('quest-'+questKey); if(node) node.scrollIntoView(); }
    else window.scrollTo(0,0);
}
function mainQuestRoute() {
    const parts=window.location.hash.replace(/^#\/?/,'').split('/');
    if(parts[0].toLowerCase()!=='mainquests')return false;
    setActiveView('MainQuests');
    if(!wiki.mainQuestReady){document.getElementById('content').innerHTML='<h2>'+escapeHtml(ui('loading','Loading...'))+'</h2>';return true;}
    const key=parts[1]?decodeURIComponent(parts[1]):'';
    if(key && mainQuestGroup(key))loadMainQuestDetail(key,true,parts[2]?decodeURIComponent(parts[2]):'');
    else loadView('MainQuests',true);
    return true;
}
handleHashRoute=function(){if(!wiki.ready)return;if(mainQuestRoute())return;mainQuestPreviousRoute();};
loadView=function(view,fromRoute=false){
    if(view!=='MainQuests')return mainQuestPreviousView(view,fromRoute);
    if(!fromRoute && navigateHash('mainquests'))return;
    setActiveView('MainQuests');
    document.getElementById('content').innerHTML=wiki.mainQuestReady?renderMainQuestList():'<h2>'+escapeHtml(ui('loading','Loading...'))+'</h2>';
    if(wiki.mainQuestReady)attachListSearch('.main-quest-list-card');
    window.scrollTo(0,0);
};
window.addEventListener('hashchange',handleHashRoute);
const mainQuestPromise=(async()=>{
    const [index,localisation]=await Promise.all([loadJson('data/main-quest-groups.json',[]),loadJson('data/main-quest-localisation.json',{})]);
    wiki.mainQuestLocalisation=localisation;
    wiki.mainQuestGroups=await Promise.all(index.map(async entry=>{
        const group=await loadJson('data/'+entry.file,{quests:[]});
        return {...entry,quests:group.quests||[]};
    }));
    await Promise.allSettled([typeof tileDataPromise !== 'undefined' ? tileDataPromise : Promise.resolve(), typeof itemDataPromise !== 'undefined' ? itemDataPromise : Promise.resolve(), typeof equipmentDataPromise !== 'undefined' ? equipmentDataPromise : Promise.resolve(), typeof monstersDataPromise !== 'undefined' ? monstersDataPromise : Promise.resolve()]);
    wiki.mainQuestReady=true;
    if(wiki.ready && window.location.hash.toLowerCase().startsWith('#/mainquests'))handleHashRoute();
})();

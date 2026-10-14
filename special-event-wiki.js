// Special Events display localized objectives only; source quest and dialogue records remain in JSON.
wiki.specialEventGroups = [];
wiki.specialEventLocalisation = {};
wiki.specialEventsReady = false;
const specialEventPreviousRoute = handleHashRoute;
const specialEventPreviousView = loadView;
window.removeEventListener('hashchange', specialEventPreviousRoute);

function specialEventText(key) {
    const row = wiki.specialEventLocalisation[key] || {};
    return row[wiki.locale] || row.en || '';
}
function specialEventGroup(key) { return wiki.specialEventGroups.find(group => group.key === key); }
function specialEventReference(key) {
    if (!key) return '';
    const value = String(key).trim();
    const group = specialEventGroup(value);
    if (group) return '<a href="' + routeHash('specialevents',value) + '">' + escapeHtml(specialEventText(value) || value.replace(/([a-z])([A-Z])/g,'$1 $2')) + '</a>';
    for (const g of wiki.specialEventGroups) {
        if ((g.quests || []).some(q=>q.key===value)) return '<a href="' + routeHash('specialevents',g.key) + '/' + encodeURIComponent(value) + '">' + escapeHtml(specialEventText(value) || value.replace(/([a-z])([A-Z])/g,'$1 $2')) + '</a>';
    }
    if (/^\d+$/.test(value)) return '<a href="' + routeHash('tileareas',value) + '">' + escapeHtml(ui('tileArea','Tile Area') + ' ' + value) + '</a>';
    return mainQuestReference(value);
}
function specialEventOutcome(raw) {
    if (!raw) return '';
    return String(raw).split('|').map(token=>{
        const parts=token.split('-'), action=parts.shift();
        if (action==='GainEXP'||action==='GainCoin') return escapeHtml((action==='GainEXP'?'EXP':'Coins')+': '+Number(parts[0]||0).toLocaleString());
        if (action==='GainItem'||action==='GainEquipment'||action==='GainChest') {
            const count=parts.pop(); return escapeHtml(action==='GainItem'?'Item':action==='GainEquipment'?'Equipment':'Chest')+': '+specialEventReference(parts.join('-'))+' ×'+escapeHtml(count||'1');
        }
        if (action==='ReceiveQuest'||action==='CompleteQuest') return escapeHtml(action==='ReceiveQuest'?'Next Quest':'Complete Quest')+': '+specialEventReference(parts.join('-'));
        if (action==='RevealArea') return escapeHtml(ui('tileArea','Tile Area'))+': '+specialEventReference(parts[0]);
        if (action==='GainJob') return escapeHtml(ui('jobs','Jobs'))+': '+specialEventReference(parts.join('-'));
        if (action==='GameOver') return escapeHtml(ui('questComplete','Quest complete'));
        return mainQuestTokens(token);
    }).filter(Boolean).join(' · ');
}
// Display only source-backed, localized quest objectives; event rows supply context.
function specialEventObjective(quest) {
    if (!quest) return '';
    const meta = quest.objectiveDisplay || {};
    const key = meta.descriptionKey || quest.extraDescr;
    const description = key ? specialEventText(key) : '';
    if (description) {
        const values = String(quest.extraDescrVariables || '').split('-');
        return description.replace(/\\{(\\d+)\\}/g, (match, i) =>
            values[Number(i)] === undefined ? match : specialEventReference(values[Number(i)]));
    }
    const conditions = meta.conditionTokens || String(quest.completeCondition || '').split('|').filter(Boolean);
    return conditions.map(token => {
        const parts = token.split('-');
        const key = parts.shift();
        const template = specialEventText(key);
        if (!template) return '';
        if (!/\\{\\d+\\}/.test(template)) return escapeHtml(template);
        return template.replace(/\\{(\\d+)\\}/g, (match, i) =>
            parts[Number(i)] === undefined ? match : specialEventReference(parts[Number(i)]));
    }).filter(Boolean).join(' · ');
}
function specialEventStageCard(stage, group, index) {
    if (stage.display && !stage.display.show) return '';
    const rows = stage.steps || [];
    const active = rows.filter(row => row.type === 'Standard' || row.type === 'Resolve');
    const unique = values => [...new Set(values.filter(Boolean))];
    const location = unique(active.flatMap(row => [row.tileDataPicker, row.tileData, row.tileArea]));
    const npcs = unique(active.filter(row => row.imageType === 'NPC' || (row.type === 'Resolve' && row.eventNpcName && row.eventNpcName !== 'PLAYER'))
        .map(row => row.eventNpcName).filter(name => name && name !== 'PLAYER'));
    const title = specialEventText(stage.key) || specialEventText(group.key) || String(group.key).replace(/([a-z])([A-Z])/g, '$1 $2');
    const questKey = stage.display && stage.display.objectiveQuestKey;
    const quest = (group.quests || []).find(q => q.key === questKey);
    // Show each quest objective once, at the stage where it is received.
    const firstQuestStage = quest && group.stages.find(s => (s.questKeysReceived || []).includes(quest.key));
    const showObjective = quest && (!firstQuestStage || firstQuestStage.key === stage.key);
    let objective = showObjective ? specialEventObjective(quest) : '';
    // Event-only battles: reuse the already translated DefeatTeam template.
    if (!objective && !quest) {
        const battle = rows.flatMap(row => String(row.eventOutcome || '').split('|'))
            .find(token => token.startsWith('FightTeam-'));
        const template = specialEventText('DefeatTeam');
        if (battle && template && /\\{\\d+\\}/.test(template)) {
            const team = battle.slice('FightTeam-'.length);
            objective = template.replace(/\\{(\\d+)\\}/g, (match, i) =>
                Number(i) === 0 ? '1' : Number(i) === 1 ? specialEventReference(team) : match);
        }
    }
    const outcomes = rows.flatMap(row => String(row.eventOutcome || '').split('|')).filter(Boolean);
    const rewards = outcomes.filter(token => /^(GainItem|GainEquipment|GainChest|GainCoin|GainEXP|GainJobPoints)-/.test(token));
    const info = [];
    if (location.length) info.push('<p><strong>' + escapeHtml(ui('location','Location')) + ':</strong> ' + location.map(specialEventReference).join(' · ') + '</p>');
    if (npcs.length) info.push('<p><strong>' + escapeHtml(ui('npc','NPC')) + ':</strong> ' + npcs.map(specialEventReference).join(' · ') + '</p>');
    if (objective) info.push('<p><strong>' + escapeHtml(ui('objective','Objective')) + ':</strong> ' + objective + '</p>');
    if (rewards.length) info.push('<p><strong>' + escapeHtml(ui('reward','Reward')) + ':</strong> ' + rewards.map(specialEventOutcome).join(' · ') + '</p>');
    if (!info.length) return '';
    return '<section class="card detail-section special-event-stage" id="stage-' + encodeURIComponent(stage.key) + '"><h2>' + escapeHtml(ui('stage','Stage')) + ' ' + (index+1) + ': ' + escapeHtml(title) + '</h2>' + info.join('') + '</section>';
}
function renderSpecialEventList() {
    const cards=wiki.specialEventGroups.map(g=>'<article class="card entity-list-card main-quest-list-card" data-key="'+escapeHtml(g.key)+'" data-search="'+escapeHtml((specialEventText(g.key)||g.key).toLowerCase())+'" onclick="loadSpecialEventDetail(this.dataset.key)"><h3>'+escapeHtml(specialEventText(g.key)||g.key.replace(/([a-z])([A-Z])/g,'$1 $2'))+'</h3><p>'+g.stages.filter((stage,i)=>specialEventStageCard(stage,g,i)).length+' Objectives'+'</p></article>').join('');
    return '<div class="header-card"><h1>'+escapeHtml(ui('specialEvents','Special Events'))+'</h1><p>'+wiki.specialEventGroups.length+' '+escapeHtml(ui('entries','entries'))+'</p><input type="text" id="searchInput" class="search-input" placeholder="'+escapeHtml(ui('search','Search...'))+'"></div><div class="grid">'+cards+'</div>';
}
function loadSpecialEventDetail(key,fromRoute=false,questKey='') {
    const group=specialEventGroup(key);if(!group)return;
    if(!fromRoute&&navigateHash('specialevents',key))return;
    setActiveView('SpecialEvents');
    document.getElementById('content').innerHTML='<button class="back-btn" onclick="loadView(\'SpecialEvents\')">← '+escapeHtml(ui('back','Back'))+'</button><div class="detail-stack"><div class="card detail-title-card main-quest-title-card"><h2>'+escapeHtml(specialEventText(key)||key.replace(/([a-z])([A-Z])/g,'$1 $2'))+'</h2><p>'+group.stages.filter((stage,i)=>specialEventStageCard(stage,group,i)).length+' Objectives'+'</p></div>'+group.stages.map((stage,i)=>specialEventStageCard(stage,group,i)).filter(Boolean).map((html,i)=>html.replace(/<h2>Stage \d+:/,'<h2>Stage '+(i+1)+':')).join('')+'</div>';
    window.scrollTo(0,0);
}
function specialEventRoute() {
    const parts=window.location.hash.replace(/^#\/?/,'').split('/');
    if(parts[0].toLowerCase()!=='specialevents')return false;
    setActiveView('SpecialEvents');
    if(!wiki.specialEventsReady){document.getElementById('content').innerHTML='<h2>'+escapeHtml(ui('loading','Loading...'))+'</h2>';return true;}
    const key=parts[1]?decodeURIComponent(parts[1]):'';
    if(key&&specialEventGroup(key))loadSpecialEventDetail(key,true,parts[2]?decodeURIComponent(parts[2]):'');
    else loadView('SpecialEvents',true);
    return true;
}
handleHashRoute=function(){if(!wiki.ready)return;if(specialEventRoute())return;specialEventPreviousRoute();};
loadView=function(view,fromRoute=false){
    if(view!=='SpecialEvents')return specialEventPreviousView(view,fromRoute);
    if(!fromRoute&&navigateHash('specialevents'))return;
    setActiveView('SpecialEvents');
    document.getElementById('content').innerHTML=wiki.specialEventsReady?renderSpecialEventList():'<h2>'+escapeHtml(ui('loading','Loading...'))+'</h2>';
    if(wiki.specialEventsReady)attachListSearch('.main-quest-list-card');
    window.scrollTo(0,0);
};
window.addEventListener('hashchange',handleHashRoute);
const specialEventPromise=(async()=>{
    const [stageData,localisation]=await Promise.all([loadJson('data/special-event-stages.json',{groups:[]}),loadJson('data/special-event-localisation.json',{})]);
    wiki.specialEventLocalisation=localisation;
    wiki.specialEventGroups=stageData.groups || [];
    await Promise.allSettled([typeof mainQuestPromise!=='undefined'?mainQuestPromise:Promise.resolve(),typeof tileDataPromise!=='undefined'?tileDataPromise:Promise.resolve(),typeof itemDataPromise!=='undefined'?itemDataPromise:Promise.resolve(),typeof equipmentDataPromise!=='undefined'?equipmentDataPromise:Promise.resolve()]);
    wiki.specialEventsReady=true;
    if(wiki.ready&&window.location.hash.toLowerCase().startsWith('#/specialevents'))handleHashRoute();
})();

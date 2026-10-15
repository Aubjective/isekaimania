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
        if (action==='GainJobPoints') return escapeHtml(ui('jobPoints','Job Points'))+': '+escapeHtml(parts.join('-'));
        if (action==='GameOver') return escapeHtml(ui('questComplete','Quest complete'));
        return mainQuestTokens(token);
    }).filter(Boolean).join(' · ');
}
// Quest content is resolved independently of Special Event stage data.
function specialEventLocalizedTemplate(key, variables) {
    const template = key ? specialEventText(key) : '';
    if (!template) return '';
    const args = String(variables || '').split('-');
    const resolved = template.replace(/\{(\d+)\}/g, (match, i) =>
        args[Number(i)] === undefined ? match : specialEventReference(args[Number(i)]));
    return /\{\d+\}/.test(resolved) ? '' : resolved;
}
function specialEventQuestContent(quest) {
    if (!quest) return { title: '', objective: '' };
    const meta = quest.localization || {};
    const title = specialEventText(meta.titleKey || quest.key);
    const description = specialEventLocalizedTemplate(
        meta.descriptionKey || quest.extraDescr,
        meta.descriptionVariables || quest.extraDescrVariables
    );
    if (description) return { title, objective: description };
    const conditions = String(meta.condition || quest.completeCondition || '').split('|').filter(Boolean);
    const objective = conditions.map(token => {
        const parts = token.split('-');
        const action = parts.shift();
        return specialEventLocalizedTemplate(action, parts.join('-'));
    }).filter(Boolean).join(' · ');
    return { title, objective };
}
function specialEventStageOrder(group) {
    return (group.stages || []).map((stage, index) => ({ stage, index }))
        .sort((a, b) => {
            const an = a.stage.key.match(/(\d+)$/), bn = b.stage.key.match(/(\d+)$/);
            return an && bn ? Number(an[1]) - Number(bn[1]) || a.index - b.index : a.index - b.index;
        }).map(x => x.stage);
}
function specialEventStageQuest(stage, group) {
    const refs = stage.contentRefs || {};
    const received = refs.receivedQuestKeys || stage.questKeysReceived || [];
    const completed = refs.completedQuestKeys || stage.questKeysCompleted || [];
    // Prefer the newly received quest. Only use a completed quest if its
    // objective has not already been assigned to a prior stage.
    const chosen = received[0] || completed.find(key =>
        !group.stages.some(other => other !== stage &&
            (other.contentRefs?.receivedQuestKeys || other.questKeysReceived || []).includes(key))) || '';
    return (group.quests || []).find(q => q.key === chosen);
}
function specialEventConditionText(condition) {
    if (!condition || !condition.localizationKey) return '';
    const template = specialEventText(condition.localizationKey);
    if (!template) return '';
    const variables = condition.variables || [];
    const text = template.replace(/\{(\d+)\}/g, (match, i) =>
        variables[Number(i)] === undefined ? match : specialEventReference(variables[Number(i)]));
    return /\{\d+\}/.test(text) ? '' : text;
}
function specialEventStageCard(stage, group, index) {
    if (stage.display && stage.display.show === false) return '';
    const rows = stage.steps || [];
    const active = rows.filter(row => row.type === 'Standard' || row.type === 'Resolve');
    const unique = values => [...new Set(values.filter(Boolean))];
    const location = unique(active.flatMap(row => [row.tileDataPicker, row.tileData, row.tileArea]));
    const npcs = unique(active.filter(row => row.imageType === 'NPC' || (row.type === 'Resolve' && row.eventNpcName && row.eventNpcName !== 'PLAYER'))
        .map(row => row.eventNpcName).filter(name => name && name !== 'PLAYER'));
    const refs = stage.contentRefs || {};
    const received = refs.receivedQuestKeys || stage.questKeysReceived || [];
    const completed = refs.completedQuestKeys || stage.questKeysCompleted || [];
    const questKeys = unique([...received, ...completed, ...(refs.questKeys || [])]);
    const quests = questKeys.map(key => (group.quests || []).find(q => q.key === key)).filter(Boolean);
    const title = specialEventText(stage.key) || specialEventText(group.key) || '';
    const conditions = (refs.stageConditions || []).filter(c => c.category !== 'prerequisite');
    const requirements = unique(conditions.map(specialEventConditionText));
    const prerequisites = (refs.stageConditions || []).filter(c => c.category === 'prerequisite');
    const outcomes = rows.flatMap(row => String(row.eventOutcome || '').split('|')).filter(Boolean);
    const rewards = outcomes.filter(token => /^(GainItem|GainEquipment|GainChest|GainCoin|GainEXP|GainJobPoints)-/.test(token));
    const info = [];
    if (location.length) info.push('<p><strong>' + escapeHtml(ui('location','Location')) + ':</strong> ' + location.map(specialEventReference).join(' · ') + '</p>');
    if (npcs.length) info.push('<p><strong>' + escapeHtml(ui('npc','NPC')) + ':</strong> ' + npcs.map(specialEventReference).join(' · ') + '</p>');
    if (questKeys.length) info.push('<p><strong>' + escapeHtml(ui('quest','Quest')) + ':</strong> ' + questKeys.map(specialEventReference).join(' · ') + '</p>');
    if (requirements.length) info.push('<p><strong>' + escapeHtml(ui('requirements','Requirements')) + ':</strong> ' + requirements.join(' · ') + '</p>');
    // Internal conditions are source data, not player objectives. Keep their
    // original tokens visible without fabricating translations.
    if (prerequisites.length) info.push('<p><strong>' + escapeHtml(ui('prerequisites','Prerequisites')) + ':</strong> ' + unique(prerequisites.map(c => escapeHtml(c.raw))).join(' · ') + '</p>');
    if (rewards.length) info.push('<p><strong>' + escapeHtml(ui('reward','Reward')) + ':</strong> ' + rewards.map(specialEventOutcome).join(' · ') + '</p>');
    const extra = [];
    for (const quest of quests) {
        const content = specialEventQuestContent(quest);
        if (content.objective) extra.push('<p><strong>' + escapeHtml(content.title || quest.key) + ':</strong> ' + content.objective + '</p>');
    }
    // Dialogue is additional source-backed information, not an objective.
    const dialogue = unique((refs.dialogue || []).map(row => specialEventLocalizedTemplate(row.key, row.variables)));
    if (dialogue.length) extra.push('<p><strong>' + escapeHtml(ui('dialogue','Dialogue')) + ':</strong> ' + dialogue.join(' · ') + '</p>');
    const heading = '<h2>' + escapeHtml(ui('stage','Stage')) + ' ' + (index + 1) + (title ? ': ' + escapeHtml(title) : '') + '</h2>';
    return '<section class="card detail-section special-event-stage" id="stage-' + encodeURIComponent(stage.key) + '">' + heading
        + '<h3>' + escapeHtml(ui('basicInfo','Basic Info')) + '</h3>' + info.join('')
        + (extra.length ? '<h3>' + escapeHtml(ui('additionalInformation','Additional Information')) + '</h3>' + extra.join('') : '') + '</section>';
}
function renderSpecialEventList() {
    const cards=wiki.specialEventGroups.map(g=>'<article class="card entity-list-card main-quest-list-card" data-key="'+escapeHtml(g.key)+'" data-search="'+escapeHtml((specialEventText(g.key)||g.key).toLowerCase())+'" onclick="loadSpecialEventDetail(this.dataset.key)"><h3>'+escapeHtml(specialEventText(g.key)||g.key.replace(/([a-z])([A-Z])/g,'$1 $2'))+'</h3><p>'+specialEventStageOrder(g).filter((stage,i)=>specialEventStageCard(stage,g,i)).length+' '+escapeHtml(ui('stages','Stages'))+'</p></article>').join('');
    return '<div class="header-card"><h1>'+escapeHtml(ui('specialEvents','Special Events'))+'</h1><p>'+wiki.specialEventGroups.length+' '+escapeHtml(ui('entries','entries'))+'</p><input type="text" id="searchInput" class="search-input" placeholder="'+escapeHtml(ui('search','Search...'))+'"></div><div class="grid">'+cards+'</div>';
}
function loadSpecialEventDetail(key,fromRoute=false,questKey='') {
    const group=specialEventGroup(key);if(!group)return;
    if(!fromRoute&&navigateHash('specialevents',key))return;
    setActiveView('SpecialEvents');
    document.getElementById('content').innerHTML='<button class="back-btn" onclick="loadView(\'SpecialEvents\')">← '+escapeHtml(ui('back','Back'))+'</button><div class="detail-stack"><div class="card detail-title-card main-quest-title-card"><h2>'+escapeHtml(specialEventText(key)||key.replace(/([a-z])([A-Z])/g,'$1 $2'))+'</h2><p>'+specialEventStageOrder(group).filter((stage,i)=>specialEventStageCard(stage,group,i)).length+' '+escapeHtml(ui('stages','Stages'))+'</p></div>'+specialEventStageOrder(group).map((stage,i)=>specialEventStageCard(stage,group,i)).filter(Boolean).map((html,i)=>html.replace(/<h2>Stage \d+:/,'<h2>Stage '+(i+1)+':')).join('')+'</div>';
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

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
// Only return references backed by a localized source or a known numeric area.
// Missing entries are omitted instead of exposing internal identifiers.
function specialEventReference(key) {
    if (key === null || key === undefined) return '';
    const value = String(key).trim();
    if (!value) return '';
    const group = specialEventGroup(value);
    if (group && specialEventText(value))
        return '<a href="' + routeHash('specialevents', value) + '">' + escapeHtml(specialEventText(value)) + '</a>';
    for (const g of wiki.specialEventGroups) {
        if ((g.quests || []).some(q => q.key === value) && specialEventText(value))
            return '<a href="' + routeHash('specialevents', g.key) + '/' + encodeURIComponent(value) + '">' + escapeHtml(specialEventText(value)) + '</a>';
    }
    if (/^\d+$/.test(value)) {
        const label = escapeHtml(value);
        return typeof tileAreaById === 'function' && tileAreaById(value)
            ? '<a href="' + routeHash('tileareas', value) + '">' + label + '</a>' : label;
    }
    if (specialEventText(value)) return escapeHtml(specialEventText(value));
    if (typeof tileDataByKey === 'function' && tileDataByKey(value)) {
        const row = wiki.tileDataLocalisation && wiki.tileDataLocalisation.get(value);
        const name = row && row.Name && (row.Name[wiki.locale] || row.Name.en);
        return name ? tileDataReferenceLink(value) : '';
    }
    if (typeof monsterText === 'function' && wiki.monsterLocalisation && wiki.monsterLocalisation.has(value)) {
        const row = wiki.monsterLocalisation.get(value);
        return escapeHtml(row[wiki.locale] || row.en || '');
    }
    if (typeof itemByKey === 'function' && itemByKey(value)) return itemReferenceLink(value);
    if (typeof equipmentByKey === 'function' && equipmentByKey(value)) return equipmentReferenceLink(value);
    if (typeof mainQuestName === 'function' && mainQuestName(value)) return escapeHtml(mainQuestName(value));
    return '';
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
        args[Number(i)] === undefined ? match : (specialEventReference(args[Number(i)]) || match));
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
        variables[Number(i)] === undefined ? match : (specialEventReference(variables[Number(i)]) || match));
    return /\{\d+\}/.test(text) ? '' : text;
}
function specialEventStageCard(stage, group, index) {
    if (stage.display && stage.display.show === false) return '';
    const active = (stage.steps || []).filter(row => row.type === 'Standard' || row.type === 'Resolve');
    const unique = values => [...new Set(values.filter(Boolean))];
    const tileData = unique(active.flatMap(row => [row.tileDataPicker, row.tileData]));
    const tileArea = unique(active.map(row => row.tileArea));
    const npcs = unique(active.filter(row => row.imageType === 'NPC' || row.eventNpcName && row.eventNpcName !== 'PLAYER')
        .map(row => row.eventNpcName).filter(name => name && name !== 'PLAYER'));
    // An active quest applies to intervening stages, not just its receive/complete stage.
    const ordered = specialEventStageOrder(group);
    const received = new Map();
    let questKeys = [];
    for (const current of ordered) {
        const refs = current.contentRefs || {};
        const completed = refs.completedQuestKeys || current.questKeysCompleted || [];
        const incoming = refs.receivedQuestKeys || current.questKeysReceived || [];
        if (current === stage) {
            questKeys = unique([...received.keys(), ...completed, ...incoming]);
            break;
        }
        for (const key of completed) received.delete(key);
        for (const key of incoming) received.set(key, true);
    }
    const descriptions = unique(questKeys.map(key => {
        const quest = (group.quests || []).find(q => q.key === key);
        return quest ? specialEventQuestContent(quest).objective : '';
    }));
    const useful = new Set(['LevelAbove','CoinAbove','GradeAbove','HaveItem','HaveEquipment','HaveSkill','HaveActiveSkill','HaveJob','HaveMonster','EngagedTileData','EnteredTileArea','DefeatMonster','DefeatTeam','DefeatDungeonArena','DefeatAreaMonster']);
    const conditions = unique(((stage.contentRefs || {}).stageConditions || [])
        .filter(c => useful.has(c.action)).map(specialEventConditionText));
    const description = descriptions.length ? descriptions : conditions;
    // Only display a source value if a localization resolver can identify it.
    const localized = key => specialEventReference(key);
    const lines = [];
    const data = unique(tileData.map(localized));
    const areas = unique(tileArea.map(localized));
    const names = unique(npcs.map(localized));
    if (data.length) lines.push('<p><strong>' + escapeHtml(ui('tileData','Tile Data')) + ':</strong> ' + data.join(' · ') + '</p>');
    if (areas.length) lines.push('<p><strong>' + escapeHtml(ui('tileArea','Tile Area')) + ':</strong> ' + areas.join(' · ') + '</p>');
    if (names.length) lines.push('<p><strong>' + escapeHtml(ui('npc','NPC')) + ':</strong> ' + names.join(' · ') + '</p>');
    if (description.length) lines.push('<p><strong>' + escapeHtml(ui('description','Description')) + ':</strong> ' + description.join(' · ') + '</p>');
    return '<section class="card detail-section special-event-stage" id="stage-' + encodeURIComponent(stage.key) + '"><h2>' + escapeHtml(ui('stage','Stage')) + ' ' + (index + 1) + '</h2>' + lines.join('') + '</section>';
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
    await Promise.allSettled([typeof mainQuestPromise!=='undefined'?mainQuestPromise:Promise.resolve(),typeof tileDataPromise!=='undefined'?tileDataPromise:Promise.resolve(),typeof tileAreaDataPromise!=='undefined'?tileAreaDataPromise:Promise.resolve(),typeof monsterDataPromise!=='undefined'?monsterDataPromise:Promise.resolve(),typeof itemDataPromise!=='undefined'?itemDataPromise:Promise.resolve(),typeof equipmentDataPromise!=='undefined'?equipmentDataPromise:Promise.resolve()]);
    wiki.specialEventsReady=true;
    if(wiki.ready&&window.location.hash.toLowerCase().startsWith('#/specialevents'))handleHashRoute();
})();

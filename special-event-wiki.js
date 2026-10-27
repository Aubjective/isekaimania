// Special Events display localized objectives only; source quest and dialogue records remain in JSON.
wiki.specialEventGroups = [];
wiki.specialEventLocalisation = {};
wiki.specialEventMisc = {};
wiki.specialEventsReady = false;
const specialEventPreviousRoute = handleHashRoute;
const specialEventPreviousView = loadView;
window.removeEventListener('hashchange', specialEventPreviousRoute);

function specialEventText(key) {
    const row = wiki.specialEventLocalisation[key] || {};
    return row[wiki.locale] || row.en || '';
}

// Shared simple quest presentation. Source: live Quest and SpecialEvents location fields.
function wikiQuestLocations(group) {
    return (group.locations || []).map(where => {
        const places = [];
        if (where.tileData) places.push(specialEventReference(where.tileData) || escapeHtml(where.tileData));
        if (where.tileArea) places.push(specialEventAreaReference(where.tileArea));
        return places.filter(Boolean).join(' · ');
    }).filter((item,index,array)=>item&&array.indexOf(item)===index).join(' · ');
}
function wikiQuestCondition(token) {
    const fields=String(token||'').split('-'),type=fields.shift();
    if (!type || type==='EncounteredBefore') return '';
    // Raw condition fields are entity,quantity; several localization templates expect quantity,entity.
    const reverse=['HaveItem','HaveEquipment','DefeatMonster','DefeatTeam','DefeatDungeonArena','HaveMonster'];
    const args=reverse.includes(type)&&fields.length===2?[fields[1],fields[0]]:fields;
    return specialEventLocalizedTemplate(type,args);
}
function wikiQuestObjectives(group) {
    const values=[];
    for (const quest of group.quests || []) {
        const description=quest.descriptionKey ? specialEventLocalizedTemplate(quest.descriptionKey,quest.descriptionVariables) : '';
        const objective=description || String(quest.completeCondition||'').split('|').map(wikiQuestCondition).filter(Boolean).join(' · ');
        if (objective&&!values.includes(objective)) values.push(objective);
    }
    return values.join(' · ');
}
function wikiQuestCard(group,kind) {
    const isGuild=kind==='guild';
    const name=(isGuild?missionText(group.key):specialEventText(group.key)) ||
        (group.quests?.[0] ? (isGuild?missionText(group.quests[0].key):specialEventText(group.quests[0].key)) : '') ||
        group.key.replace(/([a-z])([A-Z])/g,'$1 $2');
    const where=wikiQuestLocations(group);
    const objective=wikiQuestObjectives(group);
    const href=isGuild?'missions':'specialevents';
    const body=(where?'<p><strong>'+escapeHtml(ui('where','Where'))+':</strong> '+where+'</p>':'')+
        (objective?'<p><strong>'+escapeHtml(ui('objective','Objective'))+':</strong> '+objective+'</p>':'');
    return '<article class="card entity-list-card quest-catalogue-card" data-search="'+escapeHtml((name+' '+(group.grade||'')).toLowerCase())+'" data-key="'+escapeHtml(group.key)+'" onclick="window.location.hash=routeHash(\''+href+'\',this.dataset.key)"><h3>'+escapeHtml(name)+'</h3>'+body+'</article>';
}
function wikiQuestDetail(group,kind) {
    const isGuild=kind==='guild';
    const name=(isGuild?missionText(group.key):specialEventText(group.key)) || (group.quests?.[0]?(isGuild?missionText(group.quests[0].key):specialEventText(group.quests[0].key)):'') || group.key.replace(/([a-z])([A-Z])/g,'$1 $2');
    const where=wikiQuestLocations(group);
    const objective=wikiQuestObjectives(group);
    const rows=[];
    if(where)rows.push(infoRow(ui('where','Where'),where));
    if(objective)rows.push(infoRow(ui('objective','Objective'),objective));
    return '<div class="card detail-title-card main-quest-title-card"><h2>'+escapeHtml(name)+'</h2></div><section class="card detail-section">'+rows.join('')+'</section>';
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
    // A number alone has no entity type: quantities and levels must remain numbers.
    if (/^\d+$/.test(value)) return escapeHtml(value);
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
    if (typeof itemByKey === 'function' && itemByKey(value)) {
        const row = wiki.itemLocalisation && wiki.itemLocalisation.get(value);
        const name = row && row.Name && (row.Name[wiki.locale] || row.Name.en);
        return name ? itemReferenceLink(value) : '';
    }
    if (typeof equipmentByKey === 'function' && equipmentByKey(value)) {
        const row = wiki.equipmentLocalisation && wiki.equipmentLocalisation.get(value);
        const name = row && row.Name && (row.Name[wiki.locale] || row.Name.en);
        return name ? equipmentReferenceLink(value) : '';
    }
    if (typeof mainQuestName === 'function' && mainQuestName(value)) return escapeHtml(mainQuestName(value));
    const misc = wiki.specialEventMisc[value];
    if (misc) return escapeHtml(misc[wiki.locale] || misc.en || '');
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
// Link a numeric area only when the source field explicitly identifies it as an area.
function specialEventAreaReference(value) {
    const id = String(value).trim();
    if (!/^\d+$/.test(id)) return specialEventReference(id);
    return typeof tileAreaById === 'function' && tileAreaById(id)
        ? '<a href="' + routeHash('tileareas', id) + '">' + escapeHtml(ui('tileArea', 'Tile Area') + ' ' + id) + '</a>'
        : escapeHtml(id);
}
// Quest content is resolved independently of Special Event stage data.
function specialEventLocalizedTemplate(key, variables) {
    const template = key ? specialEventText(key) : '';
    if (!template) return '';
    const args = Array.isArray(variables) ? variables : String(variables || '').split('-');
    const englishTemplate = (wiki.specialEventLocalisation[key] || {}).en || '';
    const areaIndices = new Set([...englishTemplate.matchAll(/\barea\s*\{(\d+)\}/gi)].map(match => Number(match[1])));
    // Suppress only explicitly identified quantity variables, never area IDs or levels.
    const quantityIndexes = {
        HaveItem: 0, HaveEquipment: 0, DefeatMonster: 0,
        DefeatTeam: 0, DefeatTeamAt: 0, DefeatTeamAtArea: 0,
        DefeatDungeonArena: 0, DefeatAreaMonster: 1,
        DefeatRareEncounterMonster: 1, CollectItemAndGiveTo: 0,
        QuestSlimeResearchDescription: 1, QuestElementalResearchDescription: 1
    };
    const countIndex = quantityIndexes[key];
    const hideCount = countIndex !== undefined && /^(0|1)$/.test(args[countIndex] || '');
    let displayTemplate = template;
    if (hideCount) {
        const marker = '\\{' + countIndex + '\\}';
        displayTemplate = displayTemplate
            .replace(new RegExp('\\s*x' + marker + '\\s*time\\(s\\)', 'gi'), '')
            .replace(new RegExp(marker + '\\s*(?:个|個|只|隻|次|份|体|回|つ)', 'g'), '')
            .replace(new RegExp('(?:数量|數量|количество|Число побед)\\s*[:：]\\s*' + marker, 'gi'), '')
            .replace(new RegExp(marker, 'g'), '')
            .replace(/ {2,}/g, ' ')
            .replace(/\s+([.,!?])/g, '$1');
        if (key === 'CollectItemAndGiveTo' && wiki.locale === 'en')
            displayTemplate = displayTemplate.replace('deliver them to', 'deliver it to');
    }
    const resolved = displayTemplate.replace(/\{(\d+)\}/g, (match, i) => {
        const index = Number(i);
        if (args[index] === undefined) return match;
        if (areaIndices.has(index) && /^\d+$/.test(String(args[index]))) {
            const id = String(args[index]);
            return typeof tileAreaById === 'function' && tileAreaById(id)
                ? '<a href="' + routeHash('tileareas', id) + '">' + escapeHtml(id) + '</a>'
                : escapeHtml(id);
        }
        const localized = specialEventReference(args[index]);
        if (localized) return localized;
        // Quest source variables may be plain display words (e.g. Letter, Castle,
        // Mary) rather than entity keys. Preserve readable source text instead
        // of dropping the entire localized objective.
        const source = String(args[index]).trim();
        return /^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/.test(source) ? escapeHtml(source) : match;
    });
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
    return specialEventLocalizedTemplate(condition.localizationKey, condition.variables || []);
}
function specialEventSummary(group) {
    const ordered = specialEventStageOrder(group).filter(stage => !stage.display || stage.display.show !== false);
    const locations = [], targets = [], objectives = [];
    const unique = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };
    for (const quest of (group.quests || []).slice().sort((a,b) => Number(a.questorder || 0) - Number(b.questorder || 0)))
        unique(objectives, specialEventQuestContent(quest).objective);
    for (const stage of ordered) {
        for (const step of stage.steps || []) {
            if (step.tileData || step.tileDataPicker || step.tileArea) {
                const tiles = String(step.tileDataPicker || step.tileData || '').split('|').filter(Boolean);
                for (const tile of (tiles.length ? tiles : [''])) {
                    const location = [tile ? specialEventReference(tile) : '', step.tileArea ? specialEventAreaReference(step.tileArea) : ''].filter(Boolean).join(' ');
                    if (location && locations[locations.length - 1] !== location) locations.push(location);
                }
            }
            if (step.eventNpcName && step.eventNpcName !== 'PLAYER') unique(targets, specialEventReference(step.eventNpcName));
        }
        if (!(group.quests || []).length) for (const condition of (stage.contentRefs?.stageConditions || []))
            if (condition.category === 'localized-requirement') unique(objectives, specialEventConditionText(condition));
    }
    const lines = [];
    if (locations.length) lines.push('<p><strong>' + escapeHtml(ui('locations','Locations')) + ':</strong> ' + locations.join(' → ') + '</p>');
    if (targets.length) lines.push('<p><strong>' + escapeHtml(ui('npc','NPC') + ' / ' + ui('target','Target')) + ':</strong> ' + targets.join(' · ') + '</p>');
    if (objectives.length) lines.push('<p><strong>' + escapeHtml(ui('objective','Objective')) + ':</strong> ' + objectives.join(' · ') + '</p>');
    return '<section class="card detail-section special-event-summary">' + lines.join('') + '</section>';
}
function renderSpecialEventList(){return '<div class="header-card"><h1>'+escapeHtml(ui('events','Events'))+'</h1></div><div class="grid">'+wiki.specialEventGroups.map(g=>wikiQuestCard(g,'events')).join('')+'</div>';}
function loadSpecialEventDetail(key,fromRoute=false) {
    const group=specialEventGroup(key);if(!group)return;
    if(!fromRoute&&navigateHash('specialevents',key))return;
    setActiveView('SpecialEvents');
    document.getElementById('content').innerHTML='<button class="back-btn" onclick="loadView(\'Quests\')">← '+escapeHtml(ui('back','Back'))+'</button><div class="detail-stack">'+wikiQuestDetail(group,'events')+'</div>';
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
    const [stageData,localisation,misc]=await Promise.all([loadJson('data/event-quests.json',{groups:[]}),loadJson('data/special-event-localisation.json',{}),loadJson('data/special-event-misc.json',{})]);
    wiki.specialEventLocalisation=localisation;
    wiki.specialEventMisc=misc;
    wiki.specialEventGroups=stageData.groups || [];
    await Promise.allSettled([typeof mainQuestPromise!=='undefined'?mainQuestPromise:Promise.resolve(),typeof tileDataPromise!=='undefined'?tileDataPromise:Promise.resolve(),typeof tileAreaDataPromise!=='undefined'?tileAreaDataPromise:Promise.resolve(),typeof monsterDataPromise!=='undefined'?monsterDataPromise:Promise.resolve(),typeof itemDataPromise!=='undefined'?itemDataPromise:Promise.resolve(),typeof equipmentDataPromise!=='undefined'?equipmentDataPromise:Promise.resolve()]);
    wiki.specialEventsReady=true;
    if(wiki.ready&&window.location.hash.toLowerCase().startsWith('#/specialevents'))handleHashRoute();
})();

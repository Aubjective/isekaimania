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
// Convert source event branches into one player-facing objective per actionable stage.
function specialEventStageCard(stage, group, index) {
    const rows=stage.steps || [];
    const tokens=raw=>String(raw||'').split('|').filter(Boolean);
    const unique=values=>[...new Set(values.filter(Boolean))];
    const outcomes=rows.flatMap(row=>tokens(row.eventOutcome));
    const gains=outcomes.filter(t=>/^(GainItem|GainEquipment|GainChest|GainCoin|GainEXP|GainJob|RevealArea|ReceiveQuest|CompleteQuest)-/.test(t));
    const costs=outcomes.filter(t=>/^(LostItem|LoseItem|LoseCoin|LostCoin)-/.test(t));
    const encounters=rows.filter(row=>row.type==='Standard');
    const location=unique(encounters.flatMap(row=>[row.tileDataPicker,row.tileData,row.tileArea]));
    const npcs=unique(encounters.filter(row=>row.imageType==='NPC').map(row=>row.eventNpcName).filter(name=>name && String(name).toUpperCase()!=='PLAYER'));
    const received=stage.questKeysReceived||[];
    const completed=stage.questKeysCompleted||[];
    const relevant=stage.display ? stage.display.show : !!(encounters.length || outcomes.some(t=>!/^(ReceiveQuest|CompleteQuest)-/.test(t)));
    // A follow-up containing only acknowledgement/exit dialogue is not a gameplay stage.
    if(!relevant)return '';
    const label=key=>specialEventText(key)||String(key).replace(/([a-z])([A-Z])/g,'$1 $2');
    const parsed=token=>{const parts=token.split('-');const kind=parts.shift();const count=parts.pop();return {kind,key:parts.join('-'),count};};
    const items=gains.filter(t=>/^(GainItem|GainEquipment|GainChest)-/.test(t)).map(parsed);
    const payments=costs.map(t=>{
        const p=parsed(t);
        if(p.kind==='LoseCoin'||p.kind==='LostCoin')return Number(p.key||p.count).toLocaleString()+' Coins';
        return specialEventReference(p.key)+' ×'+escapeHtml(p.count||'1');
    });
    const battles=unique(outcomes.filter(t=>/^(FightTeam|StartBattle|Battle)-/.test(t)).map(t=>t.split('-').slice(1).join('-')));
    const subject=items.length?items.map(p=>specialEventReference(p.key)+(p.count&&p.count!=='1'?' ×'+escapeHtml(p.count):'')).join(', '):'';
    const first=encounters[0]||rows[0]||{};
    const stageName=specialEventText(stage.key) || specialEventText(group.key) || (stage.key===group.key ? label(group.key) : label(stage.key.replace(/\d+$/,'')));
    const title=stageName;
    const info=[];
    if(location.length)info.push('<p><strong>'+escapeHtml(ui('location','Location'))+':</strong> '+location.map(specialEventReference).join(' · ')+'</p>');
    if(npcs.length)info.push('<p><strong>NPC:</strong> '+npcs.map(specialEventReference).join(' · ')+'</p>');
    if(payments.length)info.push('<p><strong>Requirement:</strong> '+payments.join(' · ')+'</p>');
    let objective='';
    if(subject) objective=(npcs.length?'Obtain ':'Collect ')+subject+(npcs.length?' from '+npcs.map(specialEventReference).join(', '):'')+(payments.length?' in exchange for '+payments.join(', '):'')+'.';
    else if(battles.length)objective='Defeat '+battles.map(specialEventReference).join(', ')+'.';
    else if(location.length)objective='Visit '+location.map(specialEventReference).join(' · ')+(npcs.length?' and speak with '+npcs.map(specialEventReference).join(', '):'')+'.';
    if(objective)info.push('<p><strong>Objective:</strong> '+objective+'</p>');
    const rewards=gains.filter(t=>!/^(ReceiveQuest|CompleteQuest)-/.test(t) && !items.some(p=>t===p.kind+'-'+p.key+'-'+p.count));
    if(items.length)info.push('<p><strong>Reward:</strong> '+subject+'</p>');
    if(rewards.length)info.push('<p><strong>Other rewards:</strong> '+rewards.map(specialEventOutcome).join(' · ')+'</p>');
    return '<section class="card detail-section special-event-stage" id="stage-'+encodeURIComponent(stage.key)+'"><h2>Stage '+(index+1)+': '+escapeHtml(title)+'</h2>'+info.join('')+'</section>';
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

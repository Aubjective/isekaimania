// Special Events are stage-first; quests are optional and embedded at their receive stages.
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
function specialEventQuestCard(q) {
    const title=specialEventText(q.key)||q.key.replace(/([a-z])([A-Z])/g,'$1 $2');
    const template=specialEventText(q.extraDescr);
    const variables=String(q.extraDescrVariables||'').split('-');
    // Source localisation is missing three shared description templates.
    // Provide a clearly English-only, source-key-derived objective rather than hiding guidance.
    const missingTemplates = {
        DefeatTeamAndReportToAtArea: 'Defeat {2} at {1} in area {0}, then report to {3}.',
        DefeatAmountMonsterAndReportToAtArea: 'Defeat {2} at {1} in area {0}, then report to {3}.',
        DefeatAndRetrieveAtArea: 'Defeat {2} at {1} in area {0} and retrieve the required item.'
    };
    const effectiveTemplate = template || missingTemplates[q.extraDescr] || '';
    const description=effectiveTemplate ? effectiveTemplate.split(/(\{\d+\})/g).map(part=>{
        const match=/^\{(\d+)\}$/.exec(part);
        return match ? specialEventReference(variables[Number(match[1])]||'') : escapeHtml(part);
    }).join('') : '';
    return '<article class="card detail-section main-quest-entry" id="quest-'+encodeURIComponent(q.key)+'"><h2>'+escapeHtml(ui('quest','Quest'))+' '+escapeHtml(q.questorder)+': '+escapeHtml(title)+'</h2>'+(description?'<h3>'+escapeHtml(ui('description','Description'))+'</h3><p>'+description+'</p>':'')+(q.completeOutcome?'<h3>'+escapeHtml(ui('completeOutcome','Completion Outcome'))+'</h3><div>'+specialEventOutcome(q.completeOutcome)+'</div>':'')+'</article>';
}
function specialEventStageCard(stage, group, index) {
    const first=stage.steps.find(step=>step.type==='Standard') || stage.steps[0] || {};
    const rows=stage.steps;
    const received=stage.questKeysReceived || [];
    const completed=stage.questKeysCompleted || [];
    const refs=(raw)=>String(raw||'').split('|').filter(Boolean);
    const unique=(items)=>[...new Set(items.filter(Boolean))];
    const location=unique(rows.filter(step=>step.type==='Standard').flatMap(step=>[step.tileDataPicker,step.tileData,step.tileArea]));
    const npcs=unique(rows.map(step=>step.eventNpcName));
    const battles=unique(rows.flatMap(step=>refs(step.eventOutcome).filter(token=>token.startsWith('FightTeam-')).map(token=>token.slice(10))));
    const actions=unique(rows.flatMap(step=>refs(step.eventOutcome).filter(token=>/^(GainItem|LostItem|GainCoin|LostCoin|GainEXP|GainJobPoints|GainEquipment|GainChest|RevealArea)-/.test(token))));
    const trades=rows.filter(step=>refs(step.eventOutcome).some(token=>token.startsWith('LostItem-')) && refs(step.eventOutcome).some(token=>token.startsWith('GainItem-'))).map(step=>{
        const lost=refs(step.eventOutcome).filter(token=>token.startsWith('LostItem-')).map(token=>{
            const parts=token.slice(9).split('-'),count=parts.pop();
            return specialEventReference(parts.join('-'))+' ×'+escapeHtml(count);
        }).join(', ');
        const gained=refs(step.eventOutcome).filter(token=>token.startsWith('GainItem-')).map(token=>{
            const parts=token.slice(9).split('-'),count=parts.pop();
            return specialEventReference(parts.join('-'))+' ×'+escapeHtml(count);
        }).join(', ');
        return '<p><strong>Trade:</strong> Give '+lost+' to receive '+gained+'.</p>';
    });

    const questCards=group.quests.filter(q=>received.includes(q.key) || (!group.stages.some(st=>(st.questKeysReceived||[]).includes(q.key)) && (completed.includes(q.key) || (index===0 && !group.stages.some(st=>(st.questKeysCompleted||[]).includes(q.key)))))).map(specialEventQuestCard).join('');
    const title=specialEventText(stage.key)||stage.key.replace(/([a-z])([A-Z])/g,'$1 $2');
    const info=[];
    if(location.length)info.push('<p><strong>'+escapeHtml(ui('location','Location'))+':</strong> '+location.map(specialEventReference).join(' · ')+'</p>');
    if(npcs.length)info.push('<p><strong>NPC:</strong> '+npcs.map(specialEventReference).join(' · ')+'</p>');
    if(battles.length)info.push('<p><strong>Battle:</strong> '+battles.map(specialEventReference).join(' · ')+'</p>');
    // Internal trigger conditions are retained in JSON, but not exposed as raw game logic.
    if(trades.length)info.push(...trades);
    const otherActions=actions.filter(token=>!trades.length || !/^(GainItem|LostItem)-/.test(token));
    if(otherActions.length)info.push('<p><strong>Other outcomes:</strong> '+otherActions.map(specialEventOutcome).join(' · ')+'</p>');
    if(completed.length)info.push('<p><strong>'+escapeHtml(ui('questComplete','Quest complete'))+':</strong> '+completed.map(specialEventReference).join(' · ')+'</p>');
    return '<section class="card detail-section special-event-stage" id="stage-'+encodeURIComponent(stage.key)+'"><h2>Stage '+(index+1)+': '+escapeHtml(title)+'</h2>'+info.join('')+questCards+'</section>';
}
function renderSpecialEventList() {
    const cards=wiki.specialEventGroups.map(g=>'<article class="card entity-list-card main-quest-list-card" data-key="'+escapeHtml(g.key)+'" data-search="'+escapeHtml((specialEventText(g.key)||g.key).toLowerCase())+'" onclick="loadSpecialEventDetail(this.dataset.key)"><h3>'+escapeHtml(specialEventText(g.key)||g.key.replace(/([a-z])([A-Z])/g,'$1 $2'))+'</h3><p>'+g.stageCount+' Stages · '+g.questCount+' '+escapeHtml(ui('quests','Quests'))+'</p></article>').join('');
    return '<div class="header-card"><h1>'+escapeHtml(ui('specialEvents','Special Events'))+'</h1><p>'+wiki.specialEventGroups.length+' '+escapeHtml(ui('entries','entries'))+'</p><input type="text" id="searchInput" class="search-input" placeholder="'+escapeHtml(ui('search','Search...'))+'"></div><div class="grid">'+cards+'</div>';
}
function loadSpecialEventDetail(key,fromRoute=false,questKey='') {
    const group=specialEventGroup(key);if(!group)return;
    if(!fromRoute&&navigateHash('specialevents',key))return;
    setActiveView('SpecialEvents');
    document.getElementById('content').innerHTML='<button class="back-btn" onclick="loadView(\'SpecialEvents\')">← '+escapeHtml(ui('back','Back'))+'</button><div class="detail-stack"><div class="card detail-title-card main-quest-title-card"><h2>'+escapeHtml(specialEventText(key)||key.replace(/([a-z])([A-Z])/g,'$1 $2'))+'</h2><p>'+group.stages.length+' Stages · '+group.quests.length+' '+escapeHtml(ui('quests','Quests'))+'</p></div>'+group.stages.map((stage,i)=>specialEventStageCard(stage,group,i)).join('')+'</div>';
    if(questKey){const node=document.getElementById('quest-'+questKey);if(node)node.scrollIntoView();}else window.scrollTo(0,0);
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

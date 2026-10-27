// Other Events: minimal localized Where / Objective cards; no dialogue text.
wiki.otherEventGroups=[];
wiki.otherEventsReady=false;
const otherEventLabels={
 en:{section:'Other Events',exchange:'Item Exchange',purchase:'Purchase',training:'Skill Training',battle:'Battle',receive:'Obtain {0}',coins:'Collect {0} Coins',choose:'Choose one',or:'OR',complete:'Complete {0}'},
 zh:{section:'其他事件',exchange:'物品交换',purchase:'购买',training:'技能学习',battle:'战斗',receive:'获得{0}',coins:'收集{0}金币',choose:'选择其一',or:'或',complete:'完成{0}'},
 'zh-Hant':{section:'其他事件',exchange:'物品交換',purchase:'購買',training:'技能學習',battle:'戰鬥',receive:'獲得{0}',coins:'收集{0}金幣',choose:'選擇其一',or:'或',complete:'完成{0}'},
 ja:{section:'その他のイベント',exchange:'アイテム交換',purchase:'購入',training:'スキル習得',battle:'戦闘',receive:'{0}を入手',coins:'{0}コインを集める',choose:'いずれかを選択',or:'または',complete:'{0}を完了'},
 ru:{section:'Другие события',exchange:'Обмен предметов',purchase:'Покупка',training:'Обучение навыку',battle:'Бой',receive:'Получить {0}',coins:'Собрать {0} монет',choose:'Выбрать один вариант',or:'ИЛИ',complete:'Завершить {0}'}
};
function otherLabel(key,value){
 const dict=otherEventLabels[wiki.locale]||otherEventLabels.en;
 return (dict[key]||otherEventLabels.en[key]||'').replace('{0}',value||'');
}
function otherItem(token){
 const bits=token.split('-'),kind=bits.shift(),count=bits.pop(),key=bits.join('-');
 if(kind==='CoinAbove')return otherLabel('coins',Number(key||count).toLocaleString());
 if(kind==='HaveItem')return specialEventLocalizedTemplate('HaveItem',[count,key]);
 if(kind==='GainItem') {
   const name=specialEventReference(key);
   return name?otherLabel('receive',(Number(count)>1?escapeHtml(count)+' × ':'')+name):'';
 }
 if(kind==='CompleteQuest') {
   const name=specialEventReference(key)||specialEventText(key);
   return name?otherLabel('complete',name):'';
 }
 if(kind==='GainEXP')return escapeHtml(count||key)+' EXP';
 return '';
}
function otherObjective(group){
 const branches=(group.options||[]).filter(option=>option.outcomes&&option.outcomes.length);
 const exchange=(requirements,outcomes)=>{
   const needs=(requirements||[]).map(otherItem).filter(Boolean);
   const rewards=(outcomes||[]).filter(t=>t.startsWith('GainItem-')||t.startsWith('CompleteQuest-')||t.startsWith('GainEXP-')).map(otherItem).filter(Boolean);
   return [...needs,...rewards].join(' · ');
 };
 let result='';
 if(branches.length){
   const options=branches.map(o=>exchange(o.requirements||group.requirements,o.outcomes)).filter(Boolean);
   result=options.join(' '+escapeHtml(otherLabel('or'))+' ');
 }else result=exchange(group.requirements,group.outcomes);
 if(!result && group.interactionType==='skillTraining'){
   const quest=(group.outcomes||[]).find(t=>t.startsWith('CompleteQuest-'));
   result=quest?otherItem(quest):'';
 }
 const label={itemExchange:'exchange',purchase:'purchase',skillTraining:'training',battle:'battle',dialogue:'dialogue'}[group.interactionType];
 const tag=label?otherLabel(label):'';
 return [result,tag?escapeHtml(tag):''].filter(Boolean).join(' · ');
}
function otherEventTitle(group){return specialEventText(group.key);}
function otherEventCard(group){
 const title=otherEventTitle(group),where=wikiQuestLocations(group),objective=otherObjective(group);
 return '<article class="card entity-list-card quest-catalogue-card" data-search="'+escapeHtml(title.toLowerCase())+'" data-key="'+escapeHtml(group.key)+'" onclick="window.location.hash=routeHash(\'otherevents\',this.dataset.key)"><h3>'+escapeHtml(title)+'</h3><p><strong>'+escapeHtml(ui('where','Where'))+':</strong> '+where+'</p><p><strong>'+escapeHtml(ui('objective','Objective'))+':</strong> '+objective+'</p></article>';
}
function otherEventDetail(group){
 return '<div class="card detail-title-card main-quest-title-card"><h2>'+escapeHtml(otherEventTitle(group))+'</h2></div><section class="card detail-section">'+infoRow(ui('where','Where'),wikiQuestLocations(group))+infoRow(ui('objective','Objective'),otherObjective(group))+'</section>';
}
const otherPreviousRoute=handleHashRoute;
handleHashRoute=function(){
 if(!wiki.ready)return;
 const parts=window.location.hash.replace(/^#\/?/,'').split('/');
 if(parts[0].toLowerCase()==='otherevents'&&parts[1]){
   if(!wiki.otherEventsReady){document.getElementById('content').innerHTML='<h2>'+escapeHtml(ui('loading','Loading...'))+'</h2>';return;}
   const group=wiki.otherEventGroups.find(g=>g.key===decodeURIComponent(parts[1]));
   if(group){
     setActiveView('Quests');
     document.getElementById('content').innerHTML='<button class="back-btn" onclick="loadView(\'Quests\')">← '+escapeHtml(ui('back','Back'))+'</button><div class="detail-stack">'+otherEventDetail(group)+'</div>';
     window.scrollTo(0,0);return;
   }
 }
 otherPreviousRoute();
};
window.addEventListener('hashchange',handleHashRoute);
const otherEventPromise=(async()=>{
 const data=await loadJson('data/other-events.json',{groups:[]});
 await specialEventPromise;
 wiki.otherEventGroups=(data.groups||[]).filter(g=>specialEventText(g.key)&&((g.requirements||[]).length||(g.outcomes||[]).length||(g.options||[]).length));
 wiki.otherEventsReady=true;
 if(wiki.ready&&window.location.hash.toLowerCase().startsWith('#/otherevents/'))handleHashRoute();
})();

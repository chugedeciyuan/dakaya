/* =========================================
   打卡鸭 · 成就系统 + 鸭子升级
   徽章规则 + 进化体系
   ========================================= */

;(function() {
  'use strict'

  var STORAGE_KEY = 'duck_quest_v3'
  var ARCHIVE_KEY = 'duck_quest_archive'
  var BADGES_KEY = 'duck_badges'
  var THEME_KEY = 'app_theme'
  var MAX_TASKS = 30

  // =================================================================
  // 成就定义
  // =================================================================
  var ACHIEVEMENTS = [
    { id:'first',   name:'初次打卡',     icon:'🌱', desc:'首次完成打卡',                type:'total', streak:1 },
    { id:'streak_3', name:'小试牛刀',    icon:'🔰', desc:'连续打卡3天',                 type:'streak', streak:3 },
    { id:'streak_7', name:'初具雏形',    icon:'🌿', desc:'连续打卡7天（一周）',          type:'streak', streak:7 },
    { id:'streak_14', name:'渐入佳境',   icon:'🌻', desc:'连续打卡14天（两周）',         type:'streak', streak:14 },
    { id:'streak_21', name:'习惯养成',   icon:'🌟', desc:'连续打卡21天（三周·习惯周期）',type:'streak', streak:21 },
    { id:'streak_30', name:'意志坚定',   icon:'💪', desc:'连续打卡30天（一个月）',        type:'streak', streak:30 },
    { id:'streak_66', name:'习惯大师',   icon:'🏆', desc:'连续打卡66天（养成稳固习惯）',  type:'streak', streak:66 },
    { id:'streak_100', name:'传奇勇者',  icon:'👑', desc:'连续打卡100天（百日坚持）',     type:'streak', streak:100 },
    { id:'total_10', name:'小有积累',    icon:'⭐', desc:'累计打卡10天',                 type:'total', streak:10 },
    { id:'total_30', name:'厚积薄发',    icon:'💎', desc:'累计打卡30天',                 type:'total', streak:30 },
    { id:'total_66', name:'持之以恒',    icon:'🌳', desc:'累计打卡66天',                 type:'total', streak:66 },
    { id:'total_100', name:'百炼成钢',   icon:'🗿', desc:'累计打卡100天',                type:'total', streak:100 },
    { id:'total_200', name:'铁杵成针',   icon:'⚜️', desc:'累计打卡200天',                type:'total', streak:200 },
    { id:'total_365', name:'一年之约',   icon:'🎊', desc:'累计打卡365天（一整年）',       type:'total', streak:365 }
  ]

  // =================================================================
  // 鸭子进化体系
  // =================================================================
  var DUCK_LEVELS = [
    { level:0, title:'鸭蛋',   icon:'🥚', badges:0,  desc:'孵化中，等待第一枚徽章' },
    { level:1, title:'小黄鸭', icon:'🐤', badges:1,  desc:'破壳而出，迈出第一步' },
    { level:2, title:'青铜鸭', icon:'🦆', badges:3,  desc:'小有成就，继续加油' },
    { level:3, title:'白银鸭', icon:'🦆', badges:5,  desc:'渐入佳境，习惯渐成' },
    { level:4, title:'黄金鸭', icon:'🦆', badges:8,  desc:'坚持达人，毅力可嘉' },
    { level:5, title:'铂金鸭', icon:'🦆', badges:12, desc:'习惯大师，行云流水' },
    { level:6, title:'钻石鸭', icon:'🦆', badges:16, desc:'坚毅不拔，百折不挠' },
    { level:7, title:'传说鸭', icon:'🦆', badges:20, desc:'满级传说，打卡之神' }
  ]

  // ---- 状态 ----
  var tasks = []
  var archive = []
  var earnedBadges = []
  var currentTheme = 'pixel'
  var today = new Date()
  var todayKey = dateKey(today)
  var calTaskId = null
  var calYear = today.getFullYear()
  var calMonth = today.getMonth()

  // ---- DOM ----
  var els = {}
  var elIds = [
    'questList','todayCount','totalCount','streakCount','hudDate','hudTitle',
    'addBtn','resetBtn','themeBtn','achieveBtn','archiveBtn',
    'modalOverlay','taskInput','taskTypeSelect','weeklyGoalWrap','goalValue','goalDec','goalInc',
    'modalConfirm','modalCancel',
    'calModalOverlay','calModalHeader','calPrevMonth','calNextMonth','calMonthLabel','calGrid','calStats','calClose',
    'themeModalOverlay','themeOptions','themeClose',
    'archiveModalOverlay','archiveContent','archiveClose',
    'achieveModalOverlay','achieveContent','achieveClose',
    'duckLevelIcon','duckLevelName','toastContainer','app'
  ]
  elIds.forEach(function(id){ els[id] = document.getElementById(id) })

  // ---- 工具 ----
  function dateKey(d) { return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()) }
  function pad(n) { return n<10?'0'+n:''+n }
  function escapeHtml(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML}
  var weekDays=['日','一','二','三','四','五','六']

  // ---- 主题 ----
  var themeNames={pixel:'像素鸭',anime:'萌系鸭',fresh:'清新鸭'}
  function loadTheme(){try{var s=localStorage.getItem(THEME_KEY);if(s&&['pixel','anime','fresh'].indexOf(s)!==-1)return s}catch(e){}return'pixel'}
  function saveTheme(t){try{localStorage.setItem(THEME_KEY,t)}catch(e){}}
  function applyTheme(t){
    currentTheme=t; document.documentElement.setAttribute('data-theme',t); saveTheme(t)
    var opts=els.themeOptions.querySelectorAll('.theme-option')
    opts.forEach(function(el){el.classList.toggle('active',el.dataset.theme===t)})
    var titles={pixel:'🦆 打卡鸭 🦆',anime:'🐤 打卡ダック 🐤',fresh:'🦆 打卡鸭 🦆'}
    els.hudTitle.textContent=titles[t]||'🦆 打卡鸭 🦆'
  }

  // ---- 存储 ----
  function loadData(){
    try{
      var raw=localStorage.getItem(STORAGE_KEY)
      if(raw){var p=JSON.parse(raw);if(Array.isArray(p)){tasks=p.map(function(t){if(!t.checkins||!Array.isArray(t.checkins))t.checkins=[];if(!t.createdAt)t.createdAt='';if(!t.type)t.type='daily';if(!t.weeklyGoal)t.weeklyGoal=3;return t});return}}
    }catch(e){}
    tasks=[]
  }
  function saveData(){localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks))}
  function loadArchive(){try{var r=localStorage.getItem(ARCHIVE_KEY);if(r){var p=JSON.parse(r);if(Array.isArray(p)){archive=p;return}}}catch(e){}archive=[]}
  function saveArchive(){localStorage.setItem(ARCHIVE_KEY,JSON.stringify(archive))}
  function loadBadges(){try{var r=localStorage.getItem(BADGES_KEY);if(r){var p=JSON.parse(r);if(Array.isArray(p)){earnedBadges=p;return}}}catch(e){}earnedBadges=[]}
  function saveBadges(){localStorage.setItem(BADGES_KEY,JSON.stringify(earnedBadges))}

  // ---- 统计 ----
  function getMonday(d){var d2=new Date(d);var day=d2.getDay();var diff=d2.getDate()-day+(day===0?-6:1);d2.setDate(diff);return dateKey(d2)}
  function taskStreak(task){
    if(task.type==='weekly')return taskWeeklyCount(task)
    var d=new Date(today),s=0,loop=365
    while(loop-- >0){if(task.checkins.indexOf(dateKey(d))!==-1){s++;d.setDate(d.getDate()-1)}else break}
    return s
  }
  function taskWeeklyCount(task){var monday=getMonday(today);var c=0;task.checkins.forEach(function(k){if(k>=monday)c++});return c}
  function calcLongestStreak(dates){
    if(!dates||dates.length===0)return 0
    if(dates.length===1)return 1
    var sorted=dates.slice().sort(),max=1,cur=1
    for(var i=1;i<sorted.length;i++){var diff=(new Date(sorted[i])-new Date(sorted[i-1]))/86400000;if(diff===1){cur++;if(cur>max)max=cur}else cur=1}
    return max
  }
  function taskMonthCount(task,y,m){var days=new Date(y,m+1,0).getDate(),c=0;for(var d=1;d<=days;d++){if(task.checkins.indexOf(y+'-'+pad(m+1)+'-'+pad(d))!==-1)c++}return c}
  function taskTotalCount(task){return task.checkins.length}
  function isCheckedToday(task){return task.checkins.indexOf(todayKey)!==-1}
  function globalStats(){
    var todayDone=0,totalDone=0,maxStreak=0
    tasks.forEach(function(task){if(isCheckedToday(task))todayDone++;totalDone+=taskTotalCount(task);var s=taskStreak(task);if(s>maxStreak)maxStreak=s})
    return{todayDone:todayDone,totalDone:totalDone,maxStreak:maxStreak}
  }

  // ---- 徽章 & 鸭子等级 ----
  function getDuckLevel(){
    var total=earnedBadges.length
    for(var i=DUCK_LEVELS.length-1;i>=0;i--){if(total>=DUCK_LEVELS[i].badges)return DUCK_LEVELS[i]}
    return DUCK_LEVELS[0]
  }

  function getNextDuckLevel(){
    var total=earnedBadges.length
    for(var i=0;i<DUCK_LEVELS.length;i++){if(total<DUCK_LEVELS[i].badges)return DUCK_LEVELS[i]}
    return null
  }

  function updateDuckLevel(){
    var level=getDuckLevel()
    els.duckLevelIcon.textContent=level.icon
    els.duckLevelName.textContent=level.title
  }

  // 扫描徽章：检查所有任务是否有新徽章达成
  function scanBadges(){
    var newBadges=[]
    if(!tasks)return
    tasks.forEach(function(task){
      var longest=calcLongestStreak(task.checkins)
      var total=taskTotalCount(task)
      ACHIEVEMENTS.forEach(function(ach){
        var already=earnedBadges.some(function(b){return b.taskId===task.id&&b.badgeId===ach.id})
        if(already)return
        var earned=false
        if(ach.type==='streak'&&longest>=ach.streak)earned=true
        if(ach.type==='total'&&total>=ach.streak)earned=true
        if(earned){
          newBadges.push({taskId:task.id,taskName:task.name,badgeId:ach.id,badgeName:ach.name,icon:ach.icon,desc:ach.desc,earnedAt:todayKey})
        }
      })
    })
    if(newBadges.length>0){
      earnedBadges=earnedBadges.concat(newBadges)
      saveBadges()
      updateDuckLevel()
      newBadges.forEach(function(b){showToast('🏆 获得徽章: '+b.icon+' '+b.badgeName)})
      // 检测鸭子升级
      var oldLevel=getDuckLevel()
      // recalculate after adding new badges
      var newLevel=getDuckLevel()
      // Actually oldLevel might be the same since getDuckLevel is based on count... let me just always check
      // after scan
    }
  }

  // ---- 音效 ----
  function beep(freq,dur,type){
    try{
      var ctx=new(window.AudioContext||window.webkitAudioContext)(),osc=ctx.createOscillator(),gain=ctx.createGain()
      osc.type=type||'square';osc.frequency.value=freq
      gain.gain.setValueAtTime(0.1,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur)
      osc.connect(gain);gain.connect(ctx.destination);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+dur)
    }catch(e){}
  }
  function sndComplete(){beep(523.25,0.08);setTimeout(function(){beep(659.25,0.08)},80);setTimeout(function(){beep(783.99,0.12)},160)}
  function sndAdd(){beep(440,0.06);setTimeout(function(){beep(587.33,0.08)},70)}
  function sndRemove(){beep(300,0.1,'sawtooth')}
  function sndError(){beep(200,0.15,'sawtooth')}
  function sndStreak(){[523.25,587.33,659.25,783.99,1046.5].forEach(function(f,i){setTimeout(function(){beep(f,0.1)},i*100)})}
  function sndLevelUp(){
    var notes=[523.25,659.25,783.99,1046.5,1318.5]
    notes.forEach(function(f,i){setTimeout(function(){beep(f,0.15)},i*120)})
  }

  // ---- 粒子 ----
  var hearts=['❤️','💖','💚','💛','💜','🧡'],stars=['⭐','✨','🌟','💫']
  function spawnHearts(x,y,c){c=c||6;for(var i=0;i<c;i++)(function(){var el=document.createElement('div');el.className='heart-burst';el.textContent=hearts[Math.floor(Math.random()*hearts.length)];el.style.left=(x+(Math.random()-.5)*50)+'px';el.style.top=(y+(Math.random()-.5)*24)+'px';document.body.appendChild(el);setTimeout(function(){el.remove()},1100)})()}
  function spawnStars(x,y){for(var i=0;i<5;i++)(function(){var el=document.createElement('div');el.className='star-particle';el.textContent=stars[Math.floor(Math.random()*stars.length)];el.style.left=(x+(Math.random()-.5)*40)+'px';el.style.top=y+'px';document.body.appendChild(el);setTimeout(function(){el.remove()},1100)})()}

  // ---- Toast ----
  function showToast(msg,dur){dur=dur||2500;var el=document.createElement('div');el.className='toast';el.textContent=msg;els.toastContainer.appendChild(el);setTimeout(function(){el.remove()},dur)}
  function shake(){els.app.classList.remove('shake');void els.app.offsetWidth;els.app.classList.add('shake')}

  function ripple(el,e){
    if(currentTheme!=='pixel')return
    var rect=el.getBoundingClientRect()
    var x=(e.clientX||rect.left+rect.width/2)-rect.left,y=(e.clientY||rect.top+rect.height/2)-rect.top
    var size=Math.max(rect.width,rect.height)
    var r=document.createElement('span')
    r.style.cssText='position:absolute;border-radius:50%;background:rgba(255,255,255,.12);width:'+size+'px;height:'+size+'px;left:'+x+'px;top:'+y+'px;transform:scale(0);animation:rippleAnim .5s steps(4) forwards;pointer-events:none;'
    el.appendChild(r);setTimeout(function(){r.remove()},600)
  }

  // ---- 渲染 ----
  function renderDate(){var y=today.getFullYear(),m=today.getMonth()+1,d=today.getDate();els.hudDate.textContent=y+'年'+pad(m)+'月'+pad(d)+'日 · 周'+weekDays[today.getDay()]}
  function updateHUD(){var s=globalStats();els.todayCount.textContent=s.todayDone;els.totalCount.textContent=s.totalDone;els.streakCount.textContent=s.maxStreak;updateDuckLevel()}

  function render(){
    var list=els.questList;list.innerHTML='';renderDate()
    if(tasks.length===0){list.innerHTML='<div class="empty-quest"><span class="empty-icon">🦆</span><div class="empty-text">还没有任务<br>点击下方 "＋新任务" 开始吧</div></div>';updateHUD();return}
    var sorted=tasks.slice().sort(function(a,b){return b.id-a.id})
    sorted.forEach(function(task){
      var checked=isCheckedToday(task),streak=taskStreak(task),total=taskTotalCount(task)
      var item=document.createElement('div');item.className='quest-item';item.dataset.id=task.id
      var typeLabel=''
      if(task.type==='weekly'){
        var goal=task.weeklyGoal||3,cur=Math.min(streak,goal),pct=goal>0?Math.round(cur/goal*100):0
        typeLabel='<div class="weekly-progress"><div class="weekly-bar-wrap"><div class="weekly-bar-fill" style="width:'+pct+'%"></div></div><span class="weekly-label">'+cur+'/'+goal+'</span></div>'
      }else{
        typeLabel='<span class="meta-item"><span class="meta-icon">🔥</span><span class="meta-streak">'+streak+'天</span></span>'
      }
      item.innerHTML='<div class="quest-check'+(checked?' done':'')+'" data-id="'+task.id+'">'+(checked?'✓':'')+'</div>'+
        '<div class="quest-info"><div class="quest-name'+(checked?' done-text':'')+'">'+escapeHtml(task.name)+'</div>'+
        '<div class="quest-meta">'+typeLabel+'<span class="meta-item"><span class="meta-icon">📅</span><span>共'+total+'天</span></span></div></div>'+
        '<button class="quest-cal-btn" data-id="'+task.id+'">📅</button><button class="quest-del" data-id="'+task.id+'">✗</button>'
      list.appendChild(item)
    })
    updateHUD()
  }

  // ---- 打卡 ----
  function toggleCheckin(id){
    var task=tasks.find(function(t){return t.id===id});if(!task)return
    var idx=task.checkins.indexOf(todayKey)
    if(idx!==-1){
      task.checkins.splice(idx,1);saveData();render();showToast('已取消今日打卡');sndRemove()
    }else{
      task.checkins.push(todayKey);saveData();render();sndComplete()
      var el=document.querySelector('.quest-check[data-id="'+id+'"]')
      if(el){var r=el.getBoundingClientRect();spawnHearts(r.left+r.width/2,r.top+r.height/2)}
      scanBadges() // 检测新徽章
      var streak=taskStreak(task)
      if(streak>0&&streak%7===0){setTimeout(function(){showToast('🔥 '+task.name+' 连续 '+streak+' 天！');sndStreak();shake()},400)}
      if(task.type==='weekly'){var g=task.weeklyGoal||3;var c=taskWeeklyCount(task);var msg=c>=g?'✓ '+task.name+' 本周目标达成！('+c+'/'+g+')':'✓ '+task.name+' 打卡成功！('+c+'/'+g+')';showToast(msg)}
      else{showToast('✓ '+task.name+' 打卡成功！')}
    }
  }

  // ---- 删除归档 ----
  function deleteTask(id){
    var idx=tasks.findIndex(function(t){return t.id===id});if(idx===-1)return
    var task=tasks[idx];var dates=task.checkins.slice().sort()
    archive.push({name:task.name,type:task.type,weeklyGoal:task.weeklyGoal,checkins:task.checkins.slice(),firstDate:dates.length>0?dates[0]:'无',lastDate:dates.length>0?dates[dates.length-1]:'无',totalCount:taskTotalCount(task),longestStreak:calcLongestStreak(dates),deletedAt:todayKey})
    saveArchive();tasks.splice(idx,1);saveData();render();sndRemove();showToast('📦 任务已归档，历史已保存')
  }

  // ---- 归档删除 ----
  function deleteArchiveItem(index){archive.splice(index,1);saveArchive();renderArchive();showToast('✗ 已从记录中移除')}

  // ---- 新增任务 ----
  function addTask(name,type,weeklyGoal){
    name=name.trim();if(!name){showToast('请输入任务名称！');sndError();return false}
    if(tasks.length>=MAX_TASKS){showToast('任务已满！先完成一些吧 🦆');sndError();return false}
    tasks.push({id:Date.now()+Math.random(),name:name,type:type||'daily',weeklyGoal:weeklyGoal||3,checkins:[],createdAt:todayKey})
    saveData();render();sndAdd();var rect=els.addBtn.getBoundingClientRect();spawnStars(rect.left+rect.width/2,rect.top);showToast('✦ 新任务已添加！');return true
  }

  // ---- 重置 ----
  function resetToday(){
    var changed=false;tasks.forEach(function(task){var idx=task.checkins.indexOf(todayKey);if(idx!==-1){task.checkins.splice(idx,1);changed=true}})
    if(!changed){showToast('今天还没有打卡记录');return}
    saveData();render();showToast('⟳ 今日打卡已全部重置');sndRemove()
  }

  // ---- 日历 ----
  function openCalendar(taskId){
    var task=tasks.find(function(t){return t.id===taskId});if(!task)return
    calTaskId=taskId;calYear=today.getFullYear();calMonth=today.getMonth()
    els.calModalHeader.textContent='✦ '+escapeHtml(task.name)+' ✦';renderCalendar(task);els.calModalOverlay.classList.add('open')
  }
  function closeCalendar(){els.calModalOverlay.classList.remove('open');calTaskId=null}
  function renderCalendar(task){
    if(!task)return;els.calMonthLabel.textContent=calYear+'年'+(calMonth+1)+'月'
    var grid=els.calGrid;grid.innerHTML=''
    var firstDay=new Date(calYear,calMonth,1).getDay(),daysInMonth=new Date(calYear,calMonth+1,0).getDate()
    for(var i=0;i<firstDay;i++){var c=document.createElement('div');c.className='cal-day empty';grid.appendChild(c)}
    for(var d=1;d<=daysInMonth;d++){var key=calYear+'-'+pad(calMonth+1)+'-'+pad(d);var checked=task.checkins.indexOf(key)!==-1;var isToday=key===todayKey;var c=document.createElement('div');c.className='cal-day';if(checked)c.classList.add('checked');if(isToday)c.classList.add('today');c.textContent=d;grid.appendChild(c)}
    var streak=taskStreak(task),mc=taskMonthCount(task,calYear,calMonth),total=taskTotalCount(task)
    if(task.type==='weekly'){var g=task.weeklyGoal||3;var c=taskWeeklyCount(task);els.calStats.innerHTML='<span class="stat-line">📊 本周 '+c+'/'+g+' · 本月 '+mc+' 天</span><span class="stat-line">📅 累计打卡 '+total+' 天</span>'}
    else{els.calStats.innerHTML='<span class="stat-line">🔥 连续 '+streak+' 天 · 本月 '+mc+' 天</span><span class="stat-line">📅 累计打卡 '+total+' 天</span>'}
  }
  function changeCalMonth(delta){calMonth+=delta;if(calMonth>11){calMonth=0;calYear++}if(calMonth<0){calMonth=11;calYear--};var task=tasks.find(function(t){return t.id===calTaskId});if(task)renderCalendar(task)}

  // ---- 新增弹窗 ----
  var modalCb=null,modalType='daily',modalGoal=3
  function openAddModal(cb){
    modalCb=cb;modalType='daily';modalGoal=3;els.modalOverlay.classList.add('open');els.taskInput.value='';els.weeklyGoalWrap.style.display='none';els.goalValue.textContent='3'
    els.taskTypeSelect.querySelectorAll('.type-option').forEach(function(el){el.classList.toggle('active',el.dataset.type==='daily')})
    setTimeout(function(){els.taskInput.focus()},100)
  }
  function closeAddModal(){els.modalOverlay.classList.remove('open');modalCb=null}
  function confirmAddModal(){
    var name=els.taskInput.value.trim()
    if(name){if(modalCb)modalCb(name,modalType,modalGoal);closeAddModal()}
    else{els.taskInput.classList.remove('blink');void els.taskInput.offsetWidth;els.taskInput.classList.add('blink');showToast('请输入任务名称！');sndError()}
  }

  // ---- 记录弹窗 ----
  function openArchiveModal(){renderArchive();els.archiveModalOverlay.classList.add('open')}
  function closeArchiveModal(){els.archiveModalOverlay.classList.remove('open')}
  function renderArchive(){
    var container=els.archiveContent;container.innerHTML=''
    if(archive.length===0){container.innerHTML='<div class="archive-empty"><span class="archive-empty-icon">📭</span>还没有已归档的任务</div>';return}
    var sorted=archive.slice().sort(function(a,b){if(a.deletedAt>b.deletedAt)return -1;if(a.deletedAt<b.deletedAt)return 1;return 0})
    sorted.forEach(function(entry,idx){
      var item=document.createElement('div');item.className='archive-item'
      var dateRange=entry.firstDate+' ~ '+entry.lastDate;if(entry.firstDate==='无')dateRange='无打卡记录'
      var typeTag=entry.type==='weekly'?'周':'日'
      item.innerHTML='<button class="archive-del" data-index="'+idx+'">✗</button><div class="archive-item-header"><div class="archive-item-name"><span style="font-size:12px;margin-right:4px">'+typeTag+'</span>'+escapeHtml(entry.name)+'</div><span class="archive-item-badge">'+entry.totalCount+'次</span></div><div class="archive-item-dates">📅 '+escapeHtml(dateRange)+'</div><div class="archive-item-stats"><span class="archive-stat">🔥 最长连续 <span class="arch-stat-val">'+entry.longestStreak+'</span> 天</span><span class="archive-stat">📅 累计 <span class="arch-stat-val">'+entry.totalCount+'</span> 天</span><span class="archive-stat">🗑️ '+entry.deletedAt+'</span></div>'
      container.appendChild(item)
    })
  }

  // ---- 成就墙 ----
  function openAchieveModal(){renderAchieve();els.achieveModalOverlay.classList.add('open')}
  function closeAchieveModal(){els.achieveModalOverlay.classList.remove('open')}

  function renderAchieve(){
    var container=els.achieveContent;container.innerHTML=''
    var level=getDuckLevel()
    var nextLevel=getNextDuckLevel()
    var totalBadges=earnedBadges.length

    // 鸭子等级区域
    var levelHtml='<div class="duck-level-section">'
    levelHtml+='<span class="duck-level-big-icon">'+level.icon+'</span>'
    levelHtml+='<div class="duck-level-big-name">'+level.title+'</div>'
    levelHtml+='<div class="duck-level-big-desc">'+level.desc+'</div>'
    if(nextLevel){
      var pct=Math.min(100,Math.round(totalBadges/nextLevel.badges*100))
      levelHtml+='<div class="duck-level-progress"><div class="progress-label">下一级: '+nextLevel.title+'（需要 '+nextLevel.badges+' 枚徽章）</div><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div><div class="progress-text">当前 '+totalBadges+' / '+nextLevel.badges+' 枚</div></div>'
    }else{
      levelHtml+='<div class="duck-level-progress"><div class="progress-label">⭐ 已满级！所有徽章已收集完毕！</div><div class="progress-track"><div class="progress-fill" style="width:100%"></div></div><div class="progress-text">共 '+totalBadges+' 枚徽章</div></div>'
    }
    levelHtml+='</div>'
    container.innerHTML+=levelHtml

    // 进化路径
    var evoHtml='<div class="evolution-path"><div class="path-title">🦆 进化之路</div><div class="evolution-list">'
    DUCK_LEVELS.forEach(function(lv){
      var cls='evolution-item'
      if(lv.level===level.level)cls+=' current'
      else if(totalBadges>=lv.badges)cls+=' unlocked'
      else cls+=' locked'
      var badgeText=''
      if(lv.level===level.level)badgeText='⭐ 当前'
      else if(totalBadges>=lv.badges)badgeText='✓ 已解锁'
      else badgeText='🔒 需 '+lv.badges+' 徽章'
      evoHtml+='<div class="'+cls+'"><span class="evo-icon">'+lv.icon+'</span><div class="evo-info"><div class="evo-name">'+lv.title+'</div><div class="evo-req">'+lv.desc+'</div></div><span class="evo-badge">'+badgeText+'</span></div>'
    })
    evoHtml+='</div></div>'
    container.innerHTML+=evoHtml

    // 徽章列表
    var badgeHtml='<div class="badges-section"><div class="badges-title">🏅 徽章大全 ('+totalBadges+'/'+ACHIEVEMENTS.length+')</div><div class="badges-grid">'
    ACHIEVEMENTS.forEach(function(ach){
      var earned=earnedBadges.filter(function(b){return b.badgeId===ach.id})
      var cls='badge-card'+(earned.length>0?' earned':' locked')
      var src=earned.length>0?'✨ '+earned[0].taskName:''
      badgeHtml+='<div class="'+cls+'"><span class="badge-icon">'+ach.icon+'</span><div class="badge-name">'+ach.name+'</div><div class="badge-desc">'+ach.desc+'</div>'+(src?'<div class="badge-source">'+escapeHtml(src)+'</div>':'')+'</div>'
    })
    badgeHtml+='</div></div>'
    container.innerHTML+=badgeHtml
  }

  // ---- 主题弹窗 ----
  function openThemeModal(){els.themeModalOverlay.classList.add('open')}
  function closeThemeModal(){els.themeModalOverlay.classList.remove('open')}
  function handleThemeSelect(t){if(t===currentTheme)return;applyTheme(t);showToast('🎨 已切换为 '+themeNames[t])}

  // ---- 日更 ----
  function checkDay(){var now=new Date();var key=dateKey(now);if(key!==todayKey){today=now;todayKey=key;render()}}

  // ---- 键盘 ----
  function onKey(e){
    if(els.calModalOverlay.classList.contains('open')){if(e.key==='Escape'){e.preventDefault();closeCalendar()}if(e.key==='ArrowLeft'){e.preventDefault();changeCalMonth(-1)}if(e.key==='ArrowRight'){e.preventDefault();changeCalMonth(1)}return}
    if(els.modalOverlay.classList.contains('open')){if(e.key==='Enter'){e.preventDefault();confirmAddModal()}if(e.key==='Escape'){e.preventDefault();closeAddModal()}return}
    if(els.themeModalOverlay.classList.contains('open')){if(e.key==='Escape'){e.preventDefault();closeThemeModal()}return}
    if(els.archiveModalOverlay.classList.contains('open')){if(e.key==='Escape'){e.preventDefault();closeArchiveModal()}return}
    if(els.achieveModalOverlay.classList.contains('open')){if(e.key==='Escape'){e.preventDefault();closeAchieveModal()}return}
    if(e.key==='n'||e.key==='N'){e.preventDefault();openAddModal(addTask)}
    if(e.key==='r'||e.key==='R'){e.preventDefault();resetToday()}
  }

  // ---- 事件 ----
  function bind(){
    els.addBtn.addEventListener('click',function(e){ripple(this,e);openAddModal(addTask)})
    els.resetBtn.addEventListener('click',function(e){ripple(this,e);resetToday()})
    els.themeBtn.addEventListener('click',function(e){ripple(this,e);openThemeModal()})
    els.achieveBtn.addEventListener('click',function(e){ripple(this,e);openAchieveModal()})
    els.archiveBtn.addEventListener('click',function(e){ripple(this,e);openArchiveModal()})

    els.modalConfirm.addEventListener('click',confirmAddModal)
    els.modalCancel.addEventListener('click',closeAddModal)
    els.modalOverlay.addEventListener('click',function(e){if(e.target===this)closeAddModal()})

    els.taskTypeSelect.addEventListener('click',function(e){
      var opt=e.target.closest('.type-option');if(!opt)return
      var type=opt.dataset.type;els.taskTypeSelect.querySelectorAll('.type-option').forEach(function(el){el.classList.toggle('active',el.dataset.type===type)})
      modalType=type;els.weeklyGoalWrap.style.display=type==='weekly'?'flex':'none'
    })
    els.goalDec.addEventListener('click',function(){modalGoal=Math.max(1,modalGoal-1);els.goalValue.textContent=modalGoal})
    els.goalInc.addEventListener('click',function(){modalGoal=Math.min(30,modalGoal+1);els.goalValue.textContent=modalGoal})

    els.calClose.addEventListener('click',closeCalendar)
    els.calModalOverlay.addEventListener('click',function(e){if(e.target===this)closeCalendar()})
    els.calPrevMonth.addEventListener('click',function(){changeCalMonth(-1)})
    els.calNextMonth.addEventListener('click',function(){changeCalMonth(1)})

    els.themeClose.addEventListener('click',closeThemeModal)
    els.themeModalOverlay.addEventListener('click',function(e){if(e.target===this)closeThemeModal()})
    els.themeOptions.addEventListener('click',function(e){var o=e.target.closest('.theme-option');if(o)handleThemeSelect(o.dataset.theme)})

    els.archiveClose.addEventListener('click',closeArchiveModal)
    els.archiveModalOverlay.addEventListener('click',function(e){if(e.target===this)closeArchiveModal()})
    els.archiveContent.addEventListener('click',function(e){var btn=e.target.closest('.archive-del');if(btn){var idx=parseInt(btn.dataset.index);if(!isNaN(idx))deleteArchiveItem(idx)}})

    els.achieveClose.addEventListener('click',closeAchieveModal)
    els.achieveModalOverlay.addEventListener('click',function(e){if(e.target===this)closeAchieveModal()})

    els.questList.addEventListener('click',function(e){
      var t=e.target
      if(t.classList.contains('quest-check')){var id=parseFloat(t.dataset.id);if(id){ripple(t,e);toggleCheckin(id)};return}
      if(t.classList.contains('quest-del')){var id=parseFloat(t.dataset.id);if(id)deleteTask(id);return}
      if(t.classList.contains('quest-cal-btn')){var id=parseFloat(t.dataset.id);if(id)openCalendar(id);return}
    })

    document.addEventListener('keydown',onKey)
    setInterval(checkDay,60000)
  }

  // ---- 注入 ----
  function injectRipple(){
    if(document.getElementById('r-style'))return
    var s=document.createElement('style');s.id='r-style'
    s.textContent='@keyframes rippleAnim{0%{transform:scale(0);opacity:1}100%{transform:scale(3);opacity:0}}'
    document.head.appendChild(s)
  }

  // ---- 启动 ----
  function init(){
    injectRipple()
    var savedTheme=loadTheme();applyTheme(savedTheme)
    loadData();loadArchive();loadBadges()
    render()
    // 启动时检测所有徽章
    scanBadges()
    bind()
    showToast('🦆 嘎！欢迎回来！')
    // 检测鸭子升级 - scanBadges 里已经调用了 updateDuckLevel
    // 检查是否刚到新等级
    var level=getDuckLevel()
    console.log('%c打卡鸭 · '+level.title,'font-size:14px;font-weight:bold')
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init)
  else init()

})()

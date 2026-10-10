const KEY="bds68Tracker_v2";
let plan,state,timer=null,timerStart=0,timerElapsed=0,countdownTimer=null,notifTimer=null;

const $=id=>document.getElementById(id);
async function init(){
  plan=await fetch("plan.json").then(r=>r.json());
  state=JSON.parse(localStorage.getItem(KEY)||"null")||{
    day:1,completed:{},custom:[],studySeconds:0,examDate:"",reminderTime:"19:00",dark:false,lastNotification:""
  };
  if(state.examDate) $("examDate").value=state.examDate;
  $("reminderTime").value=state.reminderTime||"19:00";
  populateSubjects(); render(); startLive();
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function block(day){return "Block III"}
function masterTasks(){
  let a=[];
  Object.entries(plan.days).forEach(([d,ts])=>ts.forEach(t=>a.push({...t,day:+d})));
  return a;
}
function allTasks(){return masterTasks().concat(state.custom)}
function done(id){return !!state.completed[id]}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

function populateSubjects(){
  const subs=plan.subjects||[...new Set(masterTasks().map(t=>t.subject))];
  $("subjectSelect").innerHTML='<option value="">All Subjects</option>'+subs.map(s=>`<option>${esc(s)}</option>`).join("");
  $("addSubject").innerHTML=subs.map(s=>`<option>${esc(s)}</option>`).join("");
  $("subjectSelect").onchange=render;
}

function render(){
  document.body.classList.toggle("dark",!!state.dark);
  $("blockBadge").textContent=block(state.day);
  $("dayTitle").textContent=`Day ${state.day} / 23`;
  $("todayText").textContent=`${block(state.day)} • ${"Block III • 23-day high-yield plan"} • High-yield syllabus`;
  $("examDate").value=state.examDate||"";
  $("reminderTime").value=state.reminderTime||"19:00";
  document.querySelectorAll(".block-btn").forEach(b=>b.classList.toggle("active",b.dataset.block===block(state.day)));
  renderTasks();renderStats();renderSubjects();renderBacklogs();renderWeek();fillTimerTasks();
}
function currentTasks(){
  let ts=allTasks().filter(t=>t.day===state.day);
  const sub=$("subjectSelect").value;
  if(sub) ts=ts.filter(t=>t.subject===sub);
  return ts;
}
function renderTasks(){
  const ts=currentTasks();
  $("taskHeading").textContent=$("subjectSelect").value?`${$("subjectSelect").value} — Day ${state.day}`:`Today's High-Yield Topics`;
  if(!ts.length){$("tasks").innerHTML='<div class="task"><div class="task-main"><b>No tasks here.</b><div class="task-meta">Add your own topic or choose another subject.</div></div></div>';return}
  $("tasks").innerHTML=ts.map(t=>`
  <div class="task ${done(t.id)?"done":""}">
    <input type="checkbox" ${done(t.id)?"checked":""} onchange="toggle('${esc(t.id)}')">
    <div class="task-main"><div class="task-title">${esc(t.topic)}</div><div class="task-meta">${esc(t.subject)} • ⏱ ${t.minutes||60} min • Day ${t.day}${t.sourceDay?` (original Day ${t.sourceDay})`:""}</div></div>
    <span class="priority">${esc(t.priority||"High")}</span>
  </div>`).join("");
}
function toggle(id){state.completed[id]=!state.completed[id];save();render();toast(state.completed[id]?"Topic completed ✓":"Topic reopened")}
function renderStats(){
  const all=allTasks(), comp=all.filter(t=>done(t.id)).length;
  const today=all.filter(t=>t.day===state.day), tc=today.filter(t=>done(t.id)).length;
  $("todayPct").textContent=(today.length?Math.round(tc/today.length*100):0)+"%";
  const overall=all.length?Math.round(comp/all.length*100):0;
  $("overallPct").textContent=overall+"%";
  $("overallDonut").style.background=`conic-gradient(var(--purple) ${overall*3.6}deg, #e9e8f4 ${overall*3.6}deg 360deg)`;
  if($("completedStat")) $("completedStat").textContent=comp;
  const pending=all.length-comp, inProgress=all.some(t=>t.day===state.day&&!done(t.id))?1:0;
  if($("legendDone")) $("legendDone").textContent=overall+"%";
  if($("legendDoing")) $("legendDoing").textContent=(inProgress?Math.max(1,Math.round(100/all.length)):0)+"%";
  if($("legendPending")) $("legendPending").textContent=Math.max(0,100-overall-(inProgress?Math.max(1,Math.round(100/all.length)):0))+"%";
  $("backlogCount").textContent=backlogs().length;
  if($("navBacklogCount")) $("navBacklogCount").textContent=backlogs().length;
  if($("backlogHint")) $("backlogHint").textContent=backlogs().length?"Needs your attention":"Nothing overdue";
  $("studyTime").textContent=fmtHours(state.studySeconds);
  const x=all.filter(t=>t.block==="Block III"), q=x.length?Math.round(x.filter(t=>done(t.id)).length/x.length*100):0;
  $("p3").textContent=q+"%";$("b3").style.width=q+"%";
}
function renderSubjects(){
  const box=$("subjectProgress"), all=allTasks();
  box.innerHTML=(plan.subjects||[]).map(s=>{
    const x=all.filter(t=>t.subject===s),q=x.length?Math.round(x.filter(t=>done(t.id)).length/x.length*100):0;
    return `<div class="subject-line"><div class="line-top"><span>${esc(s)}</span><b>${q}%</b></div><div class="bar"><i style="width:${q}%"></i></div></div>`
  }).join("");
}
function backlogs(){return allTasks().filter(t=>t.day<state.day&&!done(t.id)).sort((a,b)=>a.day-b.day)}
function renderBacklogs(){
  const b=backlogs();
  $("backlogs").innerHTML=b.length?b.slice(0,10).map(t=>`
    <div class="backlog-item"><b>Day ${t.day} — ${esc(t.topic)}</b><div class="task-meta">${esc(t.subject)} • ${esc(t.priority||"High")} priority</div></div>`).join("")+(b.length>10?`<div class="task-meta">+ ${b.length-10} more</div>`:""):'<div class="task"><div class="task-main"><b>All clear 🎉</b><div class="task-meta">No overdue tasks.</div></div></div>';
}
function renderWeek(){
  const start=Math.max(1,Math.floor((state.day-1)/7)*7+1),end=Math.min(23,start+6);
  $("weekGrid").innerHTML=Array.from({length:end-start+1},(_,i)=>{
    const d=start+i,x=allTasks().filter(t=>t.day===d),p=x.length?Math.round(x.filter(t=>done(t.id)).length/x.length*100):0;
    return `<div class="daybox"><strong>Day ${d}</strong><span>${p}%</span><small>${p===100?"✓ Complete":p?"In progress":"Pending"}</small></div>`
  }).join("");
}
function fillTimerTasks(){
  const ts=allTasks().filter(t=>t.day===state.day);
  $("timerTask").innerHTML=ts.map(t=>`<option value="${esc(t.id)}">${esc(t.topic).slice(0,75)}</option>`).join("");
}
function fmtHours(s){return `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m`}
function timerText(s){let h=String(Math.floor(s/3600)).padStart(2,"0"),m=String(Math.floor(s%3600/60)).padStart(2,"0"),x=String(s%60).padStart(2,"0");$("timer").textContent=`${h}:${m}:${x}`}
function startTimer(){if(timer)return;timerStart=Date.now()-timerElapsed*1000;timer=setInterval(()=>timerText(Math.floor((Date.now()-timerStart)/1000)),1000);toast("Study timer started")}
function pauseTimer(){if(!timer)return;timerElapsed=Math.floor((Date.now()-timerStart)/1000);clearInterval(timer);timer=null;toast("Timer paused")}
function finishTimer(){pauseTimer();if(!timerElapsed)return;state.studySeconds+=timerElapsed;timerElapsed=0;timerStart=0;timerText(0);save();render();toast("Study time saved ✓")}
function selectBlock(){state.day=1;save();render()}
function showModal(title,html){$("modalTitle").textContent=title;$("modalContent").innerHTML=html;$("modal").classList.remove("hidden")}
function weekend(){
  const b=backlogs().sort((a,b)=>({High:0,Medium:1,Low:2}[a.priority]??0)-({High:0,Medium:1,Low:2}[b.priority]??0)||a.day-b.day).slice(0,10);
  showModal("Weekend Backlog Plan",b.length?'<p class="muted">Priority is High → Medium → Low, then oldest first.</p>'+b.map(t=>`<div class="backlog-item"><b>Day ${t.day}</b> — ${esc(t.topic)}<div class="task-meta">${esc(t.subject)} • ${esc(t.priority||"High")}</div></div>`).join(""):'<div class="task"><b>No backlog.</b> Use the weekend for MCQs or later-revision topics.</div>');
}
function later(){showModal("Later Revision",plan.laterRevision.map(x=>`<div class="backlog-item">${esc(x)}</div>`).join(""))}
function addTask(){
  const topic=$("addTopic").value.trim();if(!topic){toast("Enter a topic");return}
  const subject=$("addSubject").value, priority=$("addPriority").value, minutes=+($("addMinutes").value||60);
  state.custom.push({id:"custom-"+Date.now(),day:state.day,block:block(state.day),subject,topic,priority,minutes});
  $("addTopic").value="";save();render();toast("Topic added ✓");
}
function exportProgress(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="bds-68-day-progress.json";a.click();URL.revokeObjectURL(a.href);
}
function importProgress(file){const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);save();render();toast("Progress imported ✓")}catch{toast("Invalid file")}};r.readAsText(file)}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}

function saveSettings(){
  state.examDate=$("examDate").value;state.reminderTime=$("reminderTime").value||"19:00";save();toast("Settings saved ✓");renderCountdown();
}
function renderCountdown(){
  const el=$("countdown");
  if(!state.examDate){el.textContent="SET EXAM DATE";return}
  const target=new Date(state.examDate).getTime(), diff=target-Date.now();
  if(diff<=0){el.textContent="EXAM TIME";return}
  const sec=Math.floor(diff/1000),days=Math.floor(sec/86400),h=Math.floor(sec%86400/3600),m=Math.floor(sec%3600/60),s=sec%60;
  el.textContent=`${days}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
}
function startLive(){renderCountdown();countdownTimer=setInterval(renderCountdown,1000);notifTimer=setInterval(notificationCheck,60000)}
async function enableNotifications(){
  if(!("Notification" in window)){toast("This browser does not support notifications");return}
  const p=await Notification.requestPermission();toast(p==="granted"?"Notifications enabled ✓":"Notification permission not granted");
}
function notificationCheck(){
  if(Notification.permission!=="granted")return;
  const now=new Date(), hh=String(now.getHours()).padStart(2,"0"),mm=String(now.getMinutes()).padStart(2,"0"),time=`${hh}:${mm}`;
  if(time!==(state.reminderTime||"19:00")||state.lastNotification===new Date().toDateString())return;
  const b=backlogs(), today=allTasks().filter(t=>t.day===state.day&&!done(t.id));
  let body=b.length?`You have ${b.length} backlog task${b.length>1?"s":""}. Weekend plan is ready.`:today.length?`${today.length} task${today.length>1?"s":""} remain today.`:"Today's high-yield tasks are complete. 🎉";
  new Notification("BDS Study Reminder",{body});
  state.lastNotification=new Date().toDateString();save();
}

$("prevBtn").onclick=()=>{state.day=Math.max(1,state.day-1);save();render()}
$("nextBtn").onclick=()=>{state.day=Math.min(23,state.day+1);save();render()}
document.querySelectorAll(".block-btn").forEach(b=>b.onclick=()=>selectBlock())
$("startTimer").onclick=startTimer;$("pauseTimer").onclick=pauseTimer;$("finishTimer").onclick=finishTimer
$("saveSettings").onclick=saveSettings;$("notifBtn").onclick=enableNotifications;$("weekendBtn").onclick=weekend;$("laterBtn").onclick=later;$("addBtn").onclick=addTask
$("themeBtn").onclick=()=>{state.dark=!state.dark;save();render()}
$("exportBtn").onclick=exportProgress
$("importInput").onchange=e=>e.target.files[0]&&importProgress(e.target.files[0])
$("resetBtn").onclick=()=>{if(confirm("Reset all progress?")){localStorage.removeItem(KEY);location.reload()}}
$("closeModal").onclick=()=>$("modal").classList.add("hidden");$("modal").onclick=e=>{if(e.target.id==="modal")$("modal").classList.add("hidden")}
init();

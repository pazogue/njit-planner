"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COURSES } from "@/lib/config";
import type { DashboardPayload, PlannerItem } from "@/lib/types";
import { AlertIcon, ArrowIcon, BookIcon, CalendarIcon, CheckIcon, HomeIcon, PlusIcon, RefreshIcon, SearchIcon } from "./icons";

type View = "today" | "week" | "assignments" | "courses";
type LocalTask = PlannerItem;

const nav = [
  ["today", "Today", HomeIcon],
  ["week", "Week", CalendarIcon],
  ["assignments", "Assignments", CheckIcon],
  ["courses", "Courses", BookIcon],
] as const;

const dateFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const weekStartOf = (d: Date) => { const x = dayStart(d); x.setDate(x.getDate() + (x.getDay() === 0 ? -6 : 1-x.getDay())); return x; };
const isDone = (i: PlannerItem) => ["graded","submitted","complete"].includes(i.status);
const greeting = () => new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
const sourceLabel = (s: PlannerItem["source"]) => s === "live-schedule" ? "Live schedule" : s[0].toUpperCase()+s.slice(1);

function dueLabel(iso: string | null) {
  if (!iso) return "No due date";
  const due = new Date(iso), days = Math.round((dayStart(due).getTime()-dayStart(new Date()).getTime())/86400000);
  if (days < 0) return `Overdue · ${timeFmt.format(due)}`;
  if (days === 0) return `Today · ${timeFmt.format(due)}`;
  if (days === 1) return `Tomorrow · ${timeFmt.format(due)}`;
  return `${dateFmt.format(due)} · ${timeFmt.format(due)}`;
}

function score(i: PlannerItem) {
  if (!i.dueAt || isDone(i) || i.stale) return -999;
  const hours = (new Date(i.dueAt).getTime()-Date.now())/3600000;
  const urgency = hours <= 0 ? 120 : Math.max(0, 96-hours/2.5);
  const value = Math.min(28,(i.pointsPossible||0)/3.5);
  const milestone = i.source === "live-schedule" ? 10 : 0;
  return urgency + value + milestone;
}

function estimate(i: PlannerItem) {
  const t = i.title.toLowerCase();
  if (t.includes("quiz") || t.includes("survey")) return 20;
  if (t.includes("discussion") || t.includes("reflection")) return 30;
  if (t.includes("case brief")) return 45;
  if (t.includes("exam") || t.includes("midterm") || t.includes("final")) return 90;
  if ((i.pointsPossible||0) <= 10) return 25;
  if ((i.pointsPossible||0) <= 30) return 45;
  return 60;
}

function reason(i: PlannerItem) {
  if (!i.dueAt) return "Add a due date to prioritize this.";
  const hours = (new Date(i.dueAt).getTime()-Date.now())/3600000;
  if (hours <= 0) return "Already overdue — handle this first.";
  if (hours <= 12) return "Due within 12 hours — next work block.";
  if (hours <= 30) return "Due very soon — don't let it slip.";
  if ((i.pointsPossible||0) >= 50) return "High-value work with meaningful grade impact.";
  if (i.source === "live-schedule") return "Capstone milestone — start early for feedback.";
  return "Start early so it never becomes a last-minute problem.";
}

function Dot({ courseId }: { courseId: PlannerItem["courseId"] }) {
  return <span className="im-dot" style={{ background: COURSES[courseId].color }} />;
}

function AssignmentRow({ item, onToggle }: { item: PlannerItem; onToggle:(id:string)=>void }) {
  return <article className="im-row">
    <button className={`im-check ${isDone(item)?"done":""}`} disabled={item.source!=="personal"} onClick={()=>onToggle(item.id)}>{isDone(item)&&<CheckIcon/>}</button>
    <div className="im-row-main">
      <div className="im-row-meta"><span><Dot courseId={item.courseId}/>{item.course}</span><em>{sourceLabel(item.source)}</em></div>
      <h3>{item.url?<a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>:item.title}</h3>
      <p>{dueLabel(item.dueAt)}{item.pointsPossible?` · ${item.pointsPossible} pts`:""}</p>
    </div>
    <ArrowIcon/>
  </article>;
}

export default function ImmersivePlanner() {
  const [view,setView] = useState<View>("today");
  const [payload,setPayload] = useState<DashboardPayload|null>(null);
  const [syncing,setSyncing] = useState(false);
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("all");
  const [showTask,setShowTask] = useState(false);
  const [tasks,setTasks] = useState<LocalTask[]>([]);
  const [storyStep,setStoryStep] = useState(0);
  const storyRef = useRef<HTMLElement|null>(null);

  const sync = useCallback(async (manual=false)=>{
    if(manual) setSyncing(true);
    try { const r = await fetch("/api/canvas/dashboard",{cache:"no-store"}); setPayload(await r.json()); }
    catch { setPayload(p=>p||{connected:false,source:"seed",fetchedAt:new Date().toISOString(),items:[],warnings:["Could not load planner data."]}); }
    finally { setSyncing(false); }
  },[]);

  useEffect(()=>{
    const saved = localStorage.getItem("semester-local-tasks");
    if(saved) try{setTasks(JSON.parse(saved))}catch{}
    document.documentElement.dataset.theme="dark";
    sync(); const t=setInterval(()=>sync(),300000); return()=>clearInterval(t);
  },[sync]);
  useEffect(()=>localStorage.setItem("semester-local-tasks",JSON.stringify(tasks)),[tasks]);

  useEffect(()=>{
    let raf=0;
    const update=()=>{
      raf=0; const root=document.documentElement; const max=Math.max(1,root.scrollHeight-innerHeight); const p=Math.min(1,scrollY/max);
      root.style.setProperty("--im-scroll",String(p)); root.style.setProperty("--im-parallax",`${Math.min(scrollY*.055,110)}px`);
      const story=storyRef.current; if(story){const r=story.getBoundingClientRect();const travel=Math.max(1,story.offsetHeight-innerHeight);const sp=Math.min(.999,Math.max(0,-r.top/travel));setStoryStep(Math.min(3,Math.floor(sp*4)));}
    };
    const onScroll=()=>{if(!raf)raf=requestAnimationFrame(update)};update();addEventListener("scroll",onScroll,{passive:true});addEventListener("resize",onScroll);return()=>{removeEventListener("scroll",onScroll);removeEventListener("resize",onScroll);if(raf)cancelAnimationFrame(raf)};
  },[view]);

  const now = new Date();
  const items = useMemo(()=>[...(payload?.items||[]),...tasks],[payload,tasks]);
  const active = useMemo(()=>items.filter(i=>!i.stale),[items]);
  const open = useMemo(()=>active.filter(i=>!isDone(i)&&i.dueAt).sort((a,b)=>+new Date(a.dueAt!)-+new Date(b.dueAt!)),[active]);
  const urgent = useMemo(()=>[...active].filter(i=>i.dueAt&&!i.stale&&!isDone(i)).sort((a,b)=>score(b)-score(a)).slice(0,4),[active]);
  const atRisk = useMemo(()=>open.filter(i=>new Date(i.dueAt!).getTime()-Date.now()<=72*3600000).slice(0,3),[open]);
  const quickWins = useMemo(()=>open.filter(i=>estimate(i)<=30).slice(0,3),[open]);
  const ws = weekStartOf(now); const days = Array.from({length:7},(_,i)=>{const d=new Date(ws);d.setDate(d.getDate()+i);return d});
  const weekItems = active.filter(i=>i.dueAt&&new Date(i.dueAt)>=ws&&new Date(i.dueAt)<new Date(ws.getTime()+7*86400000));
  const weekOpen = weekItems.filter(i=>!isDone(i)).length; const weekDone = weekItems.filter(isDone).length;
  const pressure = weekOpen>=8?"Heavy":weekOpen>=4?"Moderate":"Light";
  const priority = urgent[0];
  const filtered = active.filter(i=>(filter==="all"||String(i.courseId)===filter)&&(!query||`${i.title} ${i.course}`.toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>!a.dueAt?1:!b.dueAt?-1:+new Date(a.dueAt)-+new Date(b.dueAt));

  const toggleTask=(id:string)=>setTasks(ts=>ts.map(t=>t.id===id?{...t,status:t.status==="complete"?"unsubmitted":"complete"}:t));
  const addTask=(form:FormData)=>{const title=String(form.get("title")||"").trim(),due=String(form.get("dueAt")||""),cid=Number(form.get("courseId")) as PlannerItem["courseId"];if(!title||!due||!COURSES[cid])return;setTasks(ts=>[...ts,{id:`personal-${Date.now()}`,courseId:cid,course:COURSES[cid].short,title,dueAt:new Date(due).toISOString(),status:"unsubmitted",source:"personal",kind:"task",detail:String(form.get("detail")||"")||undefined}]);setShowTask(false)};

  return <div className="im-app">
    <div className="im-progress"/>
    <div className="im-bg"><div className="im-photo"/><div className="im-vignette"/><div className="im-mist m1"/><div className="im-mist m2"/></div>
    <aside className="im-sidebar"><div className="im-brand"><span>S</span><div><b>Semester</b><small>Fall 2026</small></div></div><nav>{nav.map(([id,label,Icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon/><span>{label}</span></button>)}</nav><div className="im-connection"><i className={payload?.connected?"live":""}/><div><b>{payload?.connected?"Canvas live":"Preview mode"}</b><small>{payload?`Synced ${timeFmt.format(new Date(payload.fetchedAt))}`:"Connecting…"}</small></div></div></aside>
    <main className="im-main"><header className="im-top"><div className="im-mobile-brand">Semester</div><div><button className="im-ghost" onClick={()=>sync(true)}><RefreshIcon className={syncing?"spin":""}/>{syncing?"Syncing":"Sync now"}</button><button className="im-primary" onClick={()=>setShowTask(true)}><PlusIcon/>Add task</button></div></header>
      <div className="im-content">
        {!!payload?.warnings.length&&<div className="im-warning"><AlertIcon/><span>{payload.warnings[0]}</span></div>}
        {view==="today"&&<section className="im-page">
          <section className="im-hero"><div className="im-hero-copy"><p className="im-kicker">{dateFmt.format(now)}</p><h1>{greeting()},<br/><strong>Pablo.</strong></h1><p>Stay ahead of the semester without turning your life into a checklist.</p><div className="im-pills"><span>{payload?.connected?"Canvas live":"Preview data"}</span><span>5 courses</span><span>{open.length} open</span></div></div><div className="im-semester-card"><div className="im-ring" style={{"--pct":`${weekItems.length?Math.round(weekDone/weekItems.length*100):0}%`} as React.CSSProperties}><b>{weekItems.length?Math.round(weekDone/weekItems.length*100):0}%</b><span>week</span></div><div><p>Fall 2026 Semester</p><h3>{open.length} things still open</h3><small>Keep the pressure low by starting the right work earlier.</small></div></div></section>

          <section className="im-asap im-glass"><div className="im-section-title"><div><span>⚡</span><div><p>Do ASAP</p><small>Ranked by urgency, point value, and last-minute risk.</small></div></div><button onClick={()=>setView("assignments")}>View all <ArrowIcon/></button></div><div className="im-asap-list">{urgent.length?urgent.map((i,n)=><article key={i.id} className={n===0?"top":""}><div className="im-rank">{n+1}</div><div><div className="im-meta"><Dot courseId={i.courseId}/>{i.course}<em>{sourceLabel(i.source)}</em></div><h3>{i.title}</h3><p>{reason(i)}</p></div><div className="im-deadline"><b>{dueLabel(i.dueAt)}</b><span>{i.pointsPossible?`${i.pointsPossible} pts`:"Milestone"}</span>{i.url?<a href={i.url} target="_blank" rel="noreferrer">Start</a>:<button onClick={()=>setView("assignments")}>View</button>}</div></article>):<div className="im-empty">You're clear — no urgent items.</div>}</div></section>

          <section className="im-triage"><article className="im-glass"><div className="im-triage-head"><span>At Risk</span><b>{atRisk.length}</b></div><p>Needs attention before it turns into a fire drill.</p>{atRisk.map(i=><button key={i.id} onClick={()=>setView("assignments")}><span><Dot courseId={i.courseId}/>{i.course}</span><b>{i.title}</b><em>{dueLabel(i.dueAt)}</em></button>)}</article><article className="im-glass"><div className="im-triage-head"><span>Quick Wins</span><b>{quickWins.length}</b></div><p>Small things you can knock out fast.</p>{quickWins.map(i=><button key={i.id} onClick={()=>setView("assignments")}><span><Dot courseId={i.courseId}/>{i.course}</span><b>{i.title}</b><em>~{estimate(i)} min</em></button>)}</article><article className="im-glass im-pressure"><div className="im-triage-head"><span>Week Pressure</span><b>{pressure}</b></div><p>{weekOpen} unfinished item{weekOpen===1?"":"s"} this week.</p><div className="im-bars">{days.map(d=>{const c=weekItems.filter(i=>i.dueAt&&key(new Date(i.dueAt))===key(d)&&!isDone(i)).length;return <div key={key(d)}><i style={{height:`${Math.max(8,Math.min(100,c*25))}%`}}/><span>{d.toLocaleDateString("en-US",{weekday:"short"}).slice(0,1)}</span></div>})}</div></article></section>

          <section className="im-story" ref={storyRef}><div className="im-story-copy">{[["01 · Focus","One thing at a time.","Your most important task moves forward while everything else recedes."],["02 · Upcoming","See the pressure before you feel it.","Deadlines fan out in depth instead of hiding in a flat list."],["03 · Your week","Workload becomes visual.","A quick glance shows which days are filling up."],["04 · All sources","One semester, one timeline.","Canvas, syllabi, Capstone dates, and personal tasks converge."]].map((s,n)=><article className={storyStep===n?"active":""} key={s[0]}><p>{s[0]}</p><h2>{s[1]}</h2><span>{s[2]}</span></article>)}</div><div className="im-stage-wrap"><div className="im-stage"><div className="im-stage-landscape"/>{[0,1,2,3].map(n=><div key={n} className={`im-scene s${n} ${storyStep===n?"active":""}`}>{n===0&&<><small>Suggested focus</small><h3>{priority?.title||"You're caught up."}</h3><p>{priority?dueLabel(priority.dueAt):"No urgent deadlines"}</p></>}{n===1&&<div className="im-stack">{open.slice(0,4).map((i,x)=><article key={i.id} style={{"--x":x,"--course":COURSES[i.courseId].color} as React.CSSProperties}><span>{i.course}</span><b>{i.title}</b><small>{dueLabel(i.dueAt)}</small></article>)}</div>}{n===2&&<div className="im-weekviz">{days.map(d=>{const l=weekItems.filter(i=>i.dueAt&&key(new Date(i.dueAt))===key(d));return <div key={key(d)}><span>{d.toLocaleDateString("en-US",{weekday:"short"}).slice(0,1)}</span><div>{l.slice(0,4).map(i=><i key={i.id} style={{background:COURSES[i.courseId].color}}/>)}</div><small>{l.length}</small></div>})}</div>}{n===3&&<div className="im-syncviz"><div className="core">S</div><span className="a">Canvas</span><span className="b">Syllabus</span><span className="c">Capstone</span><span className="d">Personal</span><i/><i/></div>}</div>)}</div></div></section>

          <section className="im-best im-glass"><div className="im-best-icon">✦</div><div><p>Best next move</p><h2>{priority?`Start ${priority.course} before it becomes urgent.`:"Protect your momentum."}</h2><span>{priority?`${priority.title} is the strongest next move right now. ${reason(priority)}`:"You have breathing room. Use it to get ahead on the next assignment."}</span></div><button className="im-primary" onClick={()=>setView("assignments")}>See plan <ArrowIcon/></button></section>

          <section className="im-upcoming"><div className="im-section-head"><div><p>Timeline</p><h2>Upcoming assignments</h2></div><button onClick={()=>setView("assignments")}>View all <ArrowIcon/></button></div><div className="im-list">{open.slice(0,8).map(i=><AssignmentRow key={i.id} item={i} onToggle={toggleTask}/>)}</div></section>
        </section>}

        {view==="week"&&<section className="im-page"><div className="im-page-head"><p>Week view</p><h1>{dateFmt.format(days[0])} — {dateFmt.format(days[6])}</h1><span>Everything due this week, grouped by day.</span></div><div className="im-week-board">{days.map(d=>{const l=weekItems.filter(i=>i.dueAt&&key(new Date(i.dueAt))===key(d));return <article className={key(d)===key(now)?"today":""} key={key(d)}><header><span>{d.toLocaleDateString("en-US",{weekday:"short"})}</span><b>{d.getDate()}</b></header>{l.map(i=><div className="im-week-item" key={i.id} style={{"--course":COURSES[i.courseId].color} as React.CSSProperties}><small>{timeFmt.format(new Date(i.dueAt!))}</small><b>{i.title}</b><span>{i.course}</span></div>)}</article>})}</div></section>}

        {view==="assignments"&&<section className="im-page"><div className="im-page-head"><p>All work</p><h1>Assignments & milestones</h1><span>Canvas, live Capstone dates, syllabus deadlines, and personal tasks.</span></div><div className="im-filter"><label><SearchIcon/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search assignments"/></label><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All courses</option>{Object.entries(COURSES).map(([id,c])=><option value={id} key={id}>{c.short}</option>)}</select></div><div className="im-list">{filtered.map(i=><AssignmentRow key={i.id} item={i} onToggle={toggleTask}/>)}</div></section>}

        {view==="courses"&&<section className="im-page"><div className="im-page-head"><p>Fall 2026</p><h1>Your courses</h1><span>Five active courses in one view.</span></div><div className="im-course-grid">{Object.entries(COURSES).map(([id,c])=>{const cid=Number(id) as PlannerItem["courseId"], l=active.filter(i=>i.courseId===cid), o=l.filter(i=>i.dueAt&&!isDone(i)), d=l.filter(isDone);return <article className="im-course im-glass" key={id} style={{"--course":c.color} as React.CSSProperties}><i/><div><span>{c.short}</span><b>{o.length}</b></div><h2>{c.name}</h2><p>{o.length} open · {d.length} done</p><button onClick={()=>{setFilter(id);setView("assignments")}}>View course work <ArrowIcon/></button></article>})}</div></section>}
      </div>
    </main>

    <nav className="im-mobile-nav">{nav.map(([id,label,Icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon/><span>{label}</span></button>)}</nav>

    {showTask&&<div className="im-modal-bg" onMouseDown={()=>setShowTask(false)}><div className="im-modal" onMouseDown={e=>e.stopPropagation()}><div><p>Add a personal task</p><button onClick={()=>setShowTask(false)}>×</button></div><form action={addTask}><label>Task name<input name="title" required autoFocus placeholder="Study for PHIL quiz"/></label><div><label>Course<select name="courseId" defaultValue="72097">{Object.entries(COURSES).map(([id,c])=><option value={id} key={id}>{c.short}</option>)}</select></label><label>Due<input name="dueAt" type="datetime-local" required/></label></div><label>Notes<textarea name="detail" rows={3}/></label><button className="im-primary">Add task</button></form></div></div>}
  </div>;
}

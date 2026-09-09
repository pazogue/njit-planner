"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COURSES } from "@/lib/config";
import type { DashboardPayload, PlannerItem } from "@/lib/types";
import { AlertIcon, ArrowIcon, BookIcon, CalendarIcon, CheckIcon, HomeIcon, MoonIcon, PlusIcon, RefreshIcon, SearchIcon, SunIcon, XIcon } from "./icons";

type View = "today" | "week" | "assignments" | "courses";
type Theme = "dark" | "light";
type LocalTask = PlannerItem;

const nav = [
  ["today", "Today", HomeIcon],
  ["week", "Week", CalendarIcon],
  ["assignments", "Assignments", CheckIcon],
  ["courses", "Courses", BookIcon],
] as const;

const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

const dayStart = (date: Date) => { const d = new Date(date); d.setHours(0,0,0,0); return d; };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const weekStartOf = (date: Date) => { const d = dayStart(date); d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1-d.getDay())); return d; };

function dueLabel(iso: string | null) {
  if (!iso) return "No due date";
  const due = new Date(iso), now = new Date();
  const days = Math.round((dayStart(due).getTime()-dayStart(now).getTime())/86400000);
  if (days === 0) return `Today · ${timeFmt.format(due)}`;
  if (days === 1) return `Tomorrow · ${timeFmt.format(due)}`;
  return `${fmt.format(due)} · ${timeFmt.format(due)}`;
}

const sourceLabel = (source: PlannerItem["source"]) => source === "live-schedule" ? "Live schedule" : source[0].toUpperCase()+source.slice(1);
const isDone = (item: PlannerItem) => ["graded","submitted","complete"].includes(item.status);
const greeting = () => new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

function priorityScore(item: PlannerItem) {
  if (!item.dueAt || isDone(item) || item.stale) return -999;
  const hours = (new Date(item.dueAt).getTime()-Date.now())/3600000;
  return (hours <= 0 ? 100 : Math.max(0,80-hours/3)) + Math.min(18,(item.pointsPossible||0)/5) + (item.source === "live-schedule" ? 8 : 0);
}

function CourseDot({ courseId }: { courseId: PlannerItem["courseId"] }) {
  return <span className="course-dot" style={{ background: COURSES[courseId].color }} />;
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round(done/total*100) : 0;
  return <div className="progress-ring" style={{"--p": `${pct*3.6}deg`} as React.CSSProperties}><div><b>{pct}%</b><span>week</span></div></div>;
}

function ItemRow({ item, onToggle }: { item: PlannerItem; onToggle: (id:string)=>void }) {
  return <article className="item-row">
    <button className={`status-orb ${isDone(item)?"done":""}`} disabled={item.source!=="personal"} onClick={()=>onToggle(item.id)}>{isDone(item)&&<CheckIcon/>}</button>
    <div className="item-main">
      <div className="item-meta"><span><CourseDot courseId={item.courseId}/>{item.course}</span><em>{sourceLabel(item.source)}</em></div>
      <h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</h3>
      <div className="item-sub"><span>{dueLabel(item.dueAt)}</span>{item.pointsPossible ? <span>{item.pointsPossible} pts</span>:null}</div>
    </div>
    <ArrowIcon className="row-arrow"/>
  </article>;
}

export default function PlannerApp() {
  const [view,setView] = useState<View>("today");
  const [payload,setPayload] = useState<DashboardPayload|null>(null);
  const [loading,setLoading] = useState(true);
  const [syncing,setSyncing] = useState(false);
  const [query,setQuery] = useState("");
  const [courseFilter,setCourseFilter] = useState("all");
  const [showTask,setShowTask] = useState(false);
  const [localTasks,setLocalTasks] = useState<LocalTask[]>([]);
  const [theme,setTheme] = useState<Theme>("dark");
  const [storyStep,setStoryStep] = useState(0);
  const storyRef = useRef<HTMLElement|null>(null);

  const sync = useCallback(async (manual=false) => {
    manual ? setSyncing(true) : setLoading(true);
    try {
      const res = await fetch("/api/canvas/dashboard", {cache:"no-store"});
      setPayload(await res.json());
    } catch {
      setPayload(p=>p||{connected:false,source:"seed",fetchedAt:new Date().toISOString(),items:[],warnings:["Could not load planner data."]});
    } finally { setLoading(false); setSyncing(false); }
  },[]);

  useEffect(()=>{
    const tasks = localStorage.getItem("semester-local-tasks");
    if (tasks) try { setLocalTasks(JSON.parse(tasks)); } catch {}
    const saved = localStorage.getItem("semester-theme") as Theme|null;
    const initial: Theme = saved || "dark";
    setTheme(initial); document.documentElement.dataset.theme = initial;
    sync();
    const timer = setInterval(()=>sync(),300000);
    return ()=>clearInterval(timer);
  },[sync]);
  useEffect(()=>localStorage.setItem("semester-local-tasks",JSON.stringify(localTasks)),[localTasks]);

  useEffect(()=>{
    let raf=0;
    const update=()=>{
      raf=0;
      const root=document.documentElement;
      const max=Math.max(1,root.scrollHeight-innerHeight);
      root.style.setProperty("--scroll",String(Math.min(1,scrollY/max)));
      root.style.setProperty("--parallax",`${Math.min(scrollY*.06,80)}px`);
      const story=storyRef.current;
      if(story){const r=story.getBoundingClientRect(); const travel=Math.max(1,story.offsetHeight-innerHeight); const p=Math.min(.999,Math.max(0,-r.top/travel)); setStoryStep(Math.min(2,Math.floor(p*3)));}
    };
    const onScroll=()=>{if(!raf) raf=requestAnimationFrame(update)};
    update(); addEventListener("scroll",onScroll,{passive:true}); addEventListener("resize",onScroll);
    return()=>{removeEventListener("scroll",onScroll);removeEventListener("resize",onScroll);if(raf)cancelAnimationFrame(raf)};
  },[view]);

  useEffect(()=>{
    const nodes=[...document.querySelectorAll<HTMLElement>(".reveal")];
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){(e.target as HTMLElement).classList.add("visible");io.unobserve(e.target)}}),{threshold:.12,rootMargin:"0px 0px -8%"});
    nodes.forEach(n=>io.observe(n)); return()=>io.disconnect();
  },[view,payload?.fetchedAt]);

  const items = useMemo(()=>[...(payload?.items||[]),...localTasks],[payload,localTasks]);
  const active = useMemo(()=>items.filter(i=>!i.stale),[items]);
  const now = new Date(), today = dateKey(now), weekStart = weekStartOf(now);
  const upcoming = useMemo(()=>active.filter(i=>i.dueAt && new Date(i.dueAt)>=dayStart(now)).sort((a,b)=>+new Date(a.dueAt!)-+new Date(b.dueAt!)),[active]);
  const todayItems = upcoming.filter(i=>i.dueAt && dateKey(new Date(i.dueAt))===today);
  const priority = useMemo(()=>[...active].sort((a,b)=>priorityScore(b)-priorityScore(a)).find(i=>priorityScore(i)>-900),[active]);
  const weekDays = Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d});
  const weekItems = active.filter(i=>i.dueAt && new Date(i.dueAt)>=weekStart && new Date(i.dueAt)<new Date(weekStart.getTime()+7*86400000));
  const weekDone = weekItems.filter(isDone).length;
  const filtered = active.filter(i=>(!query||`${i.title} ${i.course}`.toLowerCase().includes(query.toLowerCase()))&&(courseFilter==="all"||String(i.courseId)===courseFilter)).sort((a,b)=>!a.dueAt?1:!b.dueAt?-1:+new Date(a.dueAt)-+new Date(b.dueAt));

  const toggleTheme=()=>{const next=theme==="dark"?"light":"dark";setTheme(next);document.documentElement.dataset.theme=next;localStorage.setItem("semester-theme",next)};
  const toggleTask=(id:string)=>setLocalTasks(ts=>ts.map(t=>t.id===id?{...t,status:t.status==="complete"?"unsubmitted":"complete"}:t));
  const addTask=(form:FormData)=>{const title=String(form.get("title")||"").trim();const courseId=Number(form.get("courseId")) as PlannerItem["courseId"];const due=String(form.get("dueAt")||"");if(!title||!due||!COURSES[courseId])return;setLocalTasks(t=>[...t,{id:`personal-${Date.now()}`,courseId,course:COURSES[courseId].short,title,dueAt:new Date(due).toISOString(),status:"unsubmitted",source:"personal",kind:"task",detail:String(form.get("detail")||"")||undefined}]);setShowTask(false)};

  return <div className="app-shell">
    <div className="scroll-progress"/><div className="ambient"><i/><i/><i/></div>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><b>Semester</b><span>Fall 2026</span></div></div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="connection"><span className={payload?.connected?"online":""}/><div><b>{payload?.connected?"Canvas live":"Preview mode"}</b><small>{payload?`Synced ${timeFmt.format(new Date(payload.fetchedAt))}`:"Connecting…"}</small></div></div><button className="theme-button" onClick={toggleTheme}>{theme==="dark"?<SunIcon/>:<MoonIcon/>}<span>{theme==="dark"?"Light mode":"Dark mode"}</span></button></div>
    </aside>

    <main><header className="topbar"><div className="mobile-brand"><div className="brand-mark">S</div><b>Semester</b></div><div className="top-actions"><button className="secondary-btn" onClick={()=>sync(true)}><RefreshIcon className={syncing?"spin":""}/><span>{syncing?"Syncing":"Sync now"}</span></button><button className="primary-btn" onClick={()=>setShowTask(true)}><PlusIcon/><span>Add task</span></button></div></header>
      <div className="content">
        {!!payload?.warnings.length&&<div className="warning-strip"><AlertIcon/><div><b>Planner checked your sources</b><span>{payload.warnings[0]}</span></div>{payload.warnings.length>1&&<em>+{payload.warnings.length-1}</em>}</div>}

        {view==="today"&&<section className="page enter">
          <div className="hero-row reveal visible"><div><p className="eyebrow">{fmt.format(now)}</p><h1>{greeting()}, Pablo.</h1><p className="lede">One calm view of Canvas, your syllabi, and the week ahead — with the important stuff moving to the front automatically.</p><div className="hero-badges"><span>Canvas live</span><span>Fall 2026</span><span>5 courses</span></div></div><ProgressRing done={weekDone} total={weekItems.length}/></div>

          <div className="today-grid reveal"><section className="glass-card focus-card"><div className="card-label"><span>Suggested focus</span><em>Priority</em></div>{priority?<><div className="focus-course"><CourseDot courseId={priority.courseId}/>{priority.course}</div><h2>{priority.title}</h2><p>{dueLabel(priority.dueAt)}</p><div className="focus-actions">{priority.url?<a className="primary-btn" href={priority.url} target="_blank" rel="noreferrer">Open in Canvas <ArrowIcon/></a>:<button className="primary-btn" onClick={()=>setView("week")}>See in week <ArrowIcon/></button>}</div></>:<div className="empty"><CheckIcon/><h2>You’re clear for now.</h2></div>}</section><section className="glass-card stats-card"><div className="card-label"><span>This week</span></div><div className="stat-grid"><div><b>{weekItems.length}</b><span>items</span></div><div><b>{weekItems.filter(i=>i.source==="canvas").length}</b><span>Canvas</span></div><div><b>{weekItems.filter(i=>i.source!=="canvas").length}</b><span>schedule</span></div></div><div className="mini-progress"><span style={{width:`${weekItems.length?weekDone/weekItems.length*100:0}%`}}/></div><p>{weekDone} of {weekItems.length} completed or submitted</p></section></div>

          <section className="scroll-story" ref={storyRef}>
            <div className="story-copy"><article className={storyStep===0?"active":""}><p className="eyebrow">01 · Focus</p><h2>The next thing that matters, without digging.</h2><p>Your highest-priority deadline stays visually dominant while everything else falls into the background.</p></article><article className={storyStep===1?"active":""}><p className="eyebrow">02 · Week</p><h2>Scroll and the planner changes context with you.</h2><p>The visual shifts from a single task to your whole week so workload becomes obvious before it becomes a problem.</p></article><article className={storyStep===2?"active":""}><p className="eyebrow">03 · Sync</p><h2>Canvas and syllabus dates become one source of truth.</h2><p>Live Canvas data, syllabus deadlines, Capstone dates, and personal tasks are merged while stale items stay out of your way.</p></article></div>
            <div className="story-stage-wrap"><div className="story-stage"><div className="stage-glow"/>
              <div className={`story-scene focus-scene ${storyStep===0?"active":""}`}><div className="scene-top"><span>Suggested focus</span><em>Priority</em></div><div className="scene-course">{priority?<><CourseDot courseId={priority.courseId}/>{priority.course}</>:"All clear"}</div><strong>{priority?.title||"You’re caught up."}</strong><small>{priority?dueLabel(priority.dueAt):"No urgent deadlines"}</small>{upcoming.slice(0,3).map((i,n)=><div className="floating-card" key={i.id} style={{"--n":n,"--c":COURSES[i.courseId].color} as React.CSSProperties}><span>{i.course}</span><b>{i.title}</b></div>)}</div>
              <div className={`story-scene week-scene ${storyStep===1?"active":""}`}><div className="scene-top"><span>This week</span><em>{weekItems.length} items</em></div><div className="mini-week">{weekDays.map(day=>{const list=weekItems.filter(i=>i.dueAt&&dateKey(new Date(i.dueAt))===dateKey(day));return <div className="mini-day" key={dateKey(day)}><span>{day.toLocaleDateString("en-US",{weekday:"short"}).slice(0,1)}</span><div>{list.slice(0,4).map(i=><i key={i.id} style={{background:COURSES[i.courseId].color}}/>)}</div><small>{list.length}</small></div>})}</div><div className="scene-footer"><span>Workload changes as deadlines approach</span><b>{weekDone}/{weekItems.length} done</b></div></div>
              <div className={`story-scene sync-scene ${storyStep===2?"active":""}`}><div className="sync-core"><span>S</span><b>Semester</b><small>{payload?.connected?"Live sync":"Preview data"}</small></div><div className="sync-source a">Canvas <b>{active.filter(i=>i.source==="canvas").length}</b></div><div className="sync-source b">Syllabus <b>{active.filter(i=>i.source==="syllabus").length}</b></div><div className="sync-source c">Capstone <b>{active.filter(i=>i.source==="live-schedule").length}</b></div><div className="sync-source d">Personal <b>{localTasks.length}</b></div><i className="ring r1"/><i className="ring r2"/></div>
              <div className="story-dots"><i className={storyStep===0?"active":""}/><i className={storyStep===1?"active":""}/><i className={storyStep===2?"active":""}/></div>
            </div></div>
          </section>

          <section className="section-block reveal"><div className="section-head"><div><p className="eyebrow">Timeline</p><h2>{todayItems.length?"Due today":"Next up"}</h2></div><button onClick={()=>setView("assignments")}>View all <ArrowIcon/></button></div><div className="list-card">{(todayItems.length?todayItems:upcoming.slice(0,7)).map(i=><ItemRow key={i.id} item={i} onToggle={toggleTask}/>)}{loading&&<div className="skeleton">Loading…</div>}</div></section>
        </section>}

        {view==="week"&&<section className="page enter"><div className="page-title"><p className="eyebrow">Week view</p><h1>{fmt.format(weekDays[0])} — {fmt.format(weekDays[6])}</h1><p>Everything due this week, grouped by day.</p></div><div className="week-board">{weekDays.map(day=>{const list=weekItems.filter(i=>i.dueAt&&dateKey(new Date(i.dueAt))===dateKey(day));return <div className={`day-column ${dateKey(day)===today?"today":""}`} key={dateKey(day)}><div className="day-head"><span>{day.toLocaleDateString("en-US",{weekday:"short"})}</span><b>{day.getDate()}</b></div>{list.map(i=><div className="week-item" key={i.id} style={{"--course":COURSES[i.courseId].color} as React.CSSProperties}><small>{timeFmt.format(new Date(i.dueAt!))}</small><b>{i.title}</b><span>{i.course}</span></div>)}{!list.length&&<span className="clear">Clear</span>}</div>})}</div></section>}

        {view==="assignments"&&<section className="page enter"><div className="page-title"><p className="eyebrow">All work</p><h1>Assignments & milestones</h1><p>Canvas, live Capstone dates, syllabus deadlines, and personal tasks.</p></div><div className="filterbar"><label><SearchIcon/><input placeholder="Search assignments" value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={courseFilter} onChange={e=>setCourseFilter(e.target.value)}><option value="all">All courses</option>{Object.entries(COURSES).map(([id,c])=><option value={id} key={id}>{c.short}</option>)}</select></div><div className="list-card">{filtered.map(i=><ItemRow key={i.id} item={i} onToggle={toggleTask}/>)}</div></section>}

        {view==="courses"&&<section className="page enter"><div className="page-title"><p className="eyebrow">Fall 2026</p><h1>Your courses</h1><p>Five active courses in one view.</p></div><div className="course-grid">{Object.entries(COURSES).map(([id,c])=>{const cid=Number(id) as PlannerItem["courseId"];const list=active.filter(i=>i.courseId===cid);const open=list.filter(i=>i.dueAt&&new Date(i.dueAt)>=dayStart(now)&&!isDone(i));const done=list.filter(isDone);return <article className="course-card" key={id} style={{"--course":c.color} as React.CSSProperties}><i/><div><span>{c.short}</span><b>{open.length}</b></div><h2>{c.name}</h2><p>{open.length} upcoming · {done.length} done</p><div className="course-progress"><span style={{width:`${list.length?done.length/list.length*100:0}%`}}/></div><button onClick={()=>{setCourseFilter(id);setView("assignments")}}>View course work <ArrowIcon/></button></article>})}</div></section>}
      </div>
    </main>

    <nav className="mobile-nav">{nav.map(([id,label,Icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon/><span>{label}</span></button>)}</nav>
    {showTask&&<div className="modal-backdrop" onMouseDown={()=>setShowTask(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">Personal planner</p><h2>Add a task</h2></div><button onClick={()=>setShowTask(false)}><XIcon/></button></div><form action={addTask}><label>Task name<input name="title" placeholder="Study for PHIL quiz" required autoFocus/></label><div className="form-row"><label>Course<select name="courseId" defaultValue="72097">{Object.entries(COURSES).map(([id,c])=><option value={id} key={id}>{c.short}</option>)}</select></label><label>Due<input name="dueAt" type="datetime-local" required/></label></div><label>Notes<textarea name="detail" rows={3}/></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowTask(false)}>Cancel</button><button className="primary-btn">Add task</button></div></form></div></div>}
  </div>;
}

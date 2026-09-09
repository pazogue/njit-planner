"use client";

import { useEffect, useRef, useState } from "react";
import ImmersivePlanner from "./ImmersivePlanner";

const STORAGE_KEY = "semester-local-tasks";

type StoredTask = Record<string, any> & { id: string };

function readLocal(): StoredTask[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function writeLocal(tasks: StoredTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function mergeTasks(local: StoredTask[], remote: StoredTask[]) {
  const map = new Map<string, StoredTask>();
  for (const task of remote) map.set(task.id, task);
  for (const task of local) map.set(task.id, { ...map.get(task.id), ...task });
  return [...map.values()];
}

export default function PlannerShell() {
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState<"syncing"|"live"|"offline">("syncing");
  const lastSnapshot = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const local = readLocal();
      try {
        const res = await fetch("/api/planner/tasks", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.connected) throw new Error(data.error || "Cloud sync unavailable");
        const merged = mergeTasks(local, data.tasks || []);
        writeLocal(merged);
        lastSnapshot.current = JSON.stringify(merged);
        if (!cancelled) setCloud("live");
      } catch {
        lastSnapshot.current = JSON.stringify(local);
        if (!cancelled) setCloud("offline");
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let busy = false;

    const pushChanges = async () => {
      if (busy) return;
      const current = readLocal();
      const snapshot = JSON.stringify(current);
      if (snapshot === lastSnapshot.current) return;
      busy = true;
      try {
        await Promise.all(current.map(task => fetch("/api/planner/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        }).then(r => { if (!r.ok) throw new Error("save failed"); })));
        lastSnapshot.current = snapshot;
        setCloud("live");
      } catch {
        setCloud("offline");
      } finally {
        busy = false;
      }
    };

    const pullRemote = async () => {
      if (busy) return;
      try {
        const res = await fetch("/api/planner/tasks", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.connected) throw new Error();
        const current = readLocal();
        const merged = mergeTasks(current, data.tasks || []);
        const mergedSnapshot = JSON.stringify(merged);
        if (mergedSnapshot !== JSON.stringify(current)) writeLocal(merged);
        lastSnapshot.current = mergedSnapshot;
        setCloud("live");
      } catch {
        setCloud("offline");
      }
    };

    const pushTimer = window.setInterval(pushChanges, 1500);
    const pullTimer = window.setInterval(pullRemote, 30000);
    return () => { window.clearInterval(pushTimer); window.clearInterval(pullTimer); };
  }, [ready]);

  if (!ready) {
    return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#050811",color:"#eef3fb",fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif"}}><div style={{textAlign:"center"}}><div style={{width:42,height:42,borderRadius:14,margin:"0 auto 14px",display:"grid",placeItems:"center",background:"linear-gradient(145deg,#fff,#b8c8e8)",color:"#111827",fontWeight:850}}>S</div><b style={{display:"block",fontSize:18}}>Syncing your planner</b><span style={{display:"block",marginTop:7,color:"#8f9bad",fontSize:12}}>Loading your personal tasks securely…</span></div></div>;
  }

  return <><ImmersivePlanner/><div title={cloud === "live" ? "Personal tasks synced to Supabase" : "Personal task cloud sync is offline"} style={{position:"fixed",right:16,bottom:16,zIndex:55,padding:"7px 10px",borderRadius:999,background:"rgba(8,13,21,.72)",border:"1px solid rgba(255,255,255,.09)",backdropFilter:"blur(18px)",fontSize:10,fontWeight:800,color:cloud === "live" ? "#75df9c" : "#e6b266",pointerEvents:"none"}}>{cloud === "live" ? "● Cloud tasks live" : "● Local tasks only"}</div></>;
}
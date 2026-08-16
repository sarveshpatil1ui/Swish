import React from "react";
import { useSwish } from "../context/SwishContext";
export default function Notifications() {
  const { notifications } = useSwish();
  const defaults = ["Riya liked your post.", "Kabir commented on your post.", "Neha started following you.", "AI moderation recommends reviewing one of your posts."];
  return <main className="page"><div className="page-heading"><span className="eyebrow">UPDATES</span><h1>Notifications</h1></div><div className="notification-list">{[...notifications.map(n => n.message), ...defaults].map((n,i)=><div className="notification" key={i}><div className="avatar small">🔔</div><div><b>{n}</b><span>Just now</span></div></div>)}</div></main>;
}
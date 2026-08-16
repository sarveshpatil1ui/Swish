import React from "react";
import { Link } from "react-router-dom";
import { useSwish } from "../context/SwishContext";

export default function Explore() {
  const { users, posts } = useSwish();
  return <main className="page"><div className="page-heading"><span className="eyebrow">DISCOVER</span><h1>Trending on campus.</h1><p>Find students, faculty, achievements, events and communities.</p></div>
    <section className="explore-grid"><div className="explore-card big"><span>🔥 TRENDING</span><h2>Hackathon Night</h2><p>342 likes • 81 comments</p></div><div className="explore-card"><span>🏆 ACHIEVEMENTS</span><h2>Student Spotlight</h2><p>Celebrate campus wins.</p></div><div className="explore-card"><span>🎉 EVENTS</span><h2>Fest Night</h2><p>Upcoming college events.</p></div></section>
    <h2 className="section-title">Student Spotlight</h2><div className="people-grid">{users.map(u => <Link to={`/profile/${u.id}`} className="person-card" key={u.id}><div className="avatar huge">{u.avatar}</div><h3>{u.name}</h3><p>{u.role === "faculty" ? u.designation : `${u.department} • ${u.year}`}</p><span>{u.followers.toLocaleString()} followers</span></Link>)}</div>
  </main>;
}
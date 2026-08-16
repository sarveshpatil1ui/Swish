import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return <div className="landing">
    <header className="landing-nav">
      <Link className="brand" to="/"><span>✦</span> SWISH</Link>
      <nav><a href="#features">Features</a><a href="#campus">Campus</a><a href="#clubs">Clubs</a><a href="#events">Events</a><a href="#about">About</a></nav>
      <div><Link className="secondary" to="/auth?mode=login">Login</Link><Link className="primary" to="/auth">Join SWISH →</Link></div>
    </header>

    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">THE DIGITAL CAMPUS WHERE YOUR COLLEGE LIFE LIVES.</div>
        <h1>YOUR CAMPUS.<br/><span>YOUR PEOPLE.</span><br/>YOUR SWISH.</h1>
        <p>The private social network for students, faculty, clubs and creators. Share. Connect. Celebrate campus life.</p>
        <div className="hero-buttons"><Link className="primary large" to="/auth">JOIN SWISH →</Link><Link className="secondary large" to="/auth?mode=login">LOGIN</Link></div>
        <div className="hero-proof"><span>● 10K+ students</span><span>● 50+ colleges</span><span>● Verified campus communities</span></div>
      </div>
      <div className="hero-scene">
        <div className="orb orb1"/><div className="orb orb2"/>
        <div className="campus-building"><div>SWISH</div><small>COLLEGE CAMPUS</small></div>
        <div className="student s1">🧑🏻‍💻</div><div className="student s2">👩🏽‍🎨</div><div className="student s3">🧑🏾‍🎧</div><div className="student s4">👩🏻‍🏫</div>
        <div className="float-card c1">🏆 Hackathon Winner</div><div className="float-card c2">🔥 Fest Night</div><div className="float-card c3">✨ Student Spotlight</div><div className="float-card c4">💚 Campus Vibes</div>
      </div>
    </section>

    <section className="stats"><div><b>10K+</b><span>Active Students</span></div><div><b>300+</b><span>Campus Clubs</span></div><div><b>1K+</b><span>Events Shared</span></div><div><b>50+</b><span>Colleges</span></div></section>

    <section className="section" id="features"><div className="section-heading"><span>WHY SWISH?</span><h2>Everything that makes campus life feel alive.</h2></div><div className="feature-grid">
      {[
        ["🔐","ONLY FOR YOUR CAMPUS","Verified students and faculty. Private. Trusted."],
        ["📸","SHARE EVERYTHING","From hackathons to memories, post it all."],
        ["🎉","CELEBRATE TOGETHER","Achievements, wins, festivals and more."],
        ["🧑‍🤝‍🧑","FIND YOUR PEOPLE","Discover friends, clubs and communities."],
        ["⚡","LIVE CAMPUS LIFE","Events, updates, chats and a lot of fun."]
      ].map(x => <div className="feature-card" key={x[1]}><i>{x[0]}</i><h3>{x[1]}</h3><p>{x[2]}</p></div>)}
    </div></section>

    <section className="campus-section" id="campus"><div><span className="eyebrow">EXPLORE YOUR CAMPUS</span><h2>A digital campus that feels like yours.</h2><p>Jump into the Library, Cafeteria, Sports Ground, Auditorium, Computer Lab or Student Center and discover what is trending.</p></div><div className="campus-map">{["📚 Library","☕ Cafeteria","🏟 Sports Ground","🎤 Auditorium","💻 Computer Lab","🎓 Student Center"].map(x => <button key={x}>{x}</button>)}</div></section>

    <section className="cta" id="about"><span>SWISH</span><h2>THE DIGITAL CAMPUS<br/>WHERE YOUR COLLEGE LIFE LIVES.</h2><Link className="primary large" to="/auth">JOIN YOUR CAMPUS →</Link></section>
  </div>;
}
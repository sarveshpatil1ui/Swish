import React from "react";
import { useState } from "react";
import { useSwish } from "../context/SwishContext";
import PostCard from "../components/PostCard";
import CreatePostModal from "../components/CreatePostModal";
import CommentDrawer from "../components/CommentDrawer";

export default function Feed() {
  const { currentUser, posts, users } = useSwish();
  const [create, setCreate] = useState(false);
  const [commentPost, setCommentPost] = useState(null);
  return <main className="app-shell">
    <div className="feed-column">
      <div className="feed-welcome"><div><span className="eyebrow">YOUR CAMPUS FEED</span><h1>Good evening, {currentUser.name.split(" ")[0]} 👋</h1><p>What's happening on campus?</p></div><button className="primary" onClick={() => setCreate(true)}>＋ Create Post</button></div>
      <div className="story-row">{users.filter(u => u.college === currentUser.college).slice(0, 6).map(u => <div className="story" key={u.id}><div className="story-ring">{u.avatar}</div><span>{u.name.split(" ")[0]}</span></div>)}</div>
      {posts.map(p => <PostCard key={p.id} post={p} onComment={setCommentPost}/>)}
    </div>
    <aside className="right-panel"><div className="side-card"><span className="eyebrow">LIVE NOW</span>{users.slice(0, 4).map(u => <div className="live-user" key={u.id}><span className="avatar small">{u.avatar}</span><div><b>{u.name}</b><small>{u.college}</small></div><i>●</i></div>)}</div><div className="side-card"><span className="eyebrow">CAMPUS PULSE</span><h3>🔥 Fest season is trending</h3><p>128 students are discussing upcoming events in your campus.</p></div></aside>
    {create && <CreatePostModal onClose={() => setCreate(false)}/>}
    {commentPost && <CommentDrawer post={commentPost} onClose={() => setCommentPost(null)}/>}
  </main>;
}
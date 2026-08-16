import React from "react";
import { useState } from "react";
import { useSwish } from "../context/SwishContext";

export default function PostCard({ post, onComment }) {
  const { users, currentUser, toggleLike, removePost } = useSwish();
  const [menu, setMenu] = useState(false);
  const author = users.find(u => u.id === post.userId);
  if (!author) return null;
  const liked = post.likedBy?.includes(currentUser.id);
  const canModerate = currentUser.role === "admin" || (currentUser.role === "faculty" && author.college === currentUser.college);

  return <article className="post-card">
    <div className="post-head">
      <div className="avatar">{author.avatar}</div>
      <div className="author-info"><strong>{author.name}</strong><span>{author.role === "faculty" ? author.designation : `${author.department} • ${author.year}`}</span></div>
      <button className="more-btn" onClick={() => setMenu(!menu)}>•••</button>
      {menu && <div className="post-menu">
        {canModerate && <button onClick={() => { if (confirm("Are you sure you want to remove this post?")) removePost(post.id); setMenu(false); }}>Remove Post</button>}
        <button onClick={() => setMenu(false)}>Close</button>
      </div>}
    </div>

    {post.image ? <img className="post-image" src={post.image} alt="Campus post" /> : <div className="post-visual">{author.avatar}<span>SWISH CAMPUS</span></div>}

    <div className="post-body">
      <div className="post-actions">
        <button className={liked ? "like active" : "like"} onClick={() => toggleLike(post.id)}>{liked ? "♥" : "♡"} {post.likes}</button>
        <button onClick={() => onComment(post)}>💬 {post.comments.length}</button>
        <button>↗ Share</button>
      </div>
      <p><strong>{author.username}</strong> {post.caption}</p>
    </div>
  </article>;
}
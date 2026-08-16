import React from "react";
import { useState } from "react";
import { useSwish } from "../context/SwishContext";

export default function CommentDrawer({ post, onClose }) {
  const { users, currentUser, addComment } = useSwish();
  const [text, setText] = useState("");
  return <div className="drawer-backdrop" onClick={onClose}>
    <aside className="comment-drawer" onClick={e => e.stopPropagation()}>
      <div className="modal-head"><h2>Comments</h2><button onClick={onClose}>×</button></div>
      <div className="comments">
        {post.comments.length ? post.comments.map(c => {
          const u = users.find(x => x.id === c.userId);
          return <div className="comment" key={c.id}><span className="avatar small">{u?.avatar}</span><div><strong>{u?.name}</strong><p>{c.text}</p></div></div>
        }) : <div className="empty">No comments yet. Start the conversation.</div>}
      </div>
      <form className="comment-form" onSubmit={e => { e.preventDefault(); addComment(post.id, text); setText(""); }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment..." />
        <button>Send</button>
      </form>
    </aside>
  </div>;
}
import React from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSwish } from "../context/SwishContext";
export default function Profile() {
  const { id } = useParams();
  const { currentUser, users, posts, toggleFollow, isFollowing, updateProfile } = useSwish();
  const user = users.find(u => u.id === (id || currentUser.id)) || currentUser;
  const own = user.id === currentUser.id;
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user.bio || "");
  const userPosts = posts.filter(p => p.userId === user.id);
  return <main className="page profile-page"><div className="profile-hero"><div className="avatar profile-avatar">{user.avatar}</div><div className="profile-info"><div className="profile-title"><h1>{user.name}</h1>{user.role === "faculty" && <span className="badge">✓ Verified Faculty</span>}</div><p>@{user.username}</p><strong>{user.role === "faculty" ? `${user.designation} • ${user.department}` : `${user.department} • ${user.year}`}</strong><span>{user.college}</span><p className="bio">{user.bio}</p><div className="profile-stats"><b>{userPosts.length}<small>Posts</small></b><b>{user.followers.toLocaleString()}<small>Followers</small></b><b>{user.following}<small>Following</small></b></div><div>{own ? <button className="secondary" onClick={() => setEditing(true)}>Edit Profile</button> : <button className="primary" onClick={() => toggleFollow(user.id)}>{isFollowing(user.id) ? "FOLLOWING" : "FOLLOW"}</button>}</div></div></div>
    {user.role === "faculty" && <div className="moderation-banner">🛡️ <b>Moderation Access</b><span>Can remove posts within {user.college}.</span></div>}
    <h2 className="section-title">Posts</h2><div className="post-grid">{userPosts.map(p => p.image ? <img key={p.id} src={p.image} alt="" /> : <div key={p.id} className="grid-placeholder">{user.avatar}<span>{p.caption}</span></div>)}</div>
    {editing && <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h2>Edit Profile</h2><button onClick={() => setEditing(false)}>×</button></div><textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio"/><button className="primary full" onClick={() => { updateProfile({ bio }); setEditing(false); }}>Save Changes</button></div></div>}
  </main>;
}
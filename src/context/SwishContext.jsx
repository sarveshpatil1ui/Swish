import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const SwishContext = createContext(null);

const seedColleges = [
  { id: 1, name: "ABC Institute of Technology", code: "ABCIT", domain: "@abc.edu.in", location: "Mumbai", active: true },
  { id: 2, name: "XYZ University", code: "XYZU", domain: "@xyz.edu.in", location: "Pune", active: true }
];

const seedUsers = [
  { id: "u1", name: "Aarav Mehta", username: "aaravm", email: "student@abc.edu.in", password: "student123", role: "student", college: "ABC Institute of Technology", department: "Computer Engineering", year: "3rd Year", followers: 1284, following: 420, bio: "Building, learning and living campus life.", avatar: "🧑🏻‍💻" },
  { id: "u2", name: "Dr. Priya Sharma", username: "priyasharma", email: "faculty@abc.edu.in", password: "faculty123", role: "faculty", designation: "Professor", college: "ABC Institute of Technology", department: "Computer Engineering", followers: 892, following: 103, bio: "Professor • Mentor • Faculty moderator", avatar: "👩🏻‍🏫" },
  { id: "u3", name: "Riya Sharma", username: "riyash", email: "riya@abc.edu.in", password: "riya123", role: "student", college: "ABC Institute of Technology", department: "Information Technology", year: "3rd Year", followers: 1284, following: 310, bio: "Design, festivals and coffee.", avatar: "👩🏻‍💻" },
  { id: "u4", name: "Kabir Khan", username: "kabirk", email: "kabir@xyz.edu.in", password: "kabir123", role: "student", college: "XYZ University", department: "Mechanical Engineering", year: "2nd Year", followers: 764, following: 250, bio: "Sports • Music • Campus vibes", avatar: "🧑🏽‍🎧" }
];

const seedPosts = [
  { id: "p1", userId: "u3", caption: "Hackathon night was INSANE 🔥", image: "", likes: 342, likedBy: [], comments: [{ id: "c1", userId: "u1", text: "This was insane 🔥" }], createdAt: Date.now() - 3600000 },
  { id: "p2", userId: "u1", caption: "Late night campus walks hit different ✨", image: "", likes: 187, likedBy: [], comments: [], createdAt: Date.now() - 7200000 },
  { id: "p3", userId: "u4", caption: "Inter-college sports day 🏆", image: "", likes: 421, likedBy: [], comments: [], createdAt: Date.now() - 10800000 }
];

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function SwishProvider({ children }) {
  const [users, setUsers] = useState(() => read("swish_users", seedUsers));
  const [posts, setPosts] = useState(() => read("swish_posts", seedPosts));
  const [colleges, setColleges] = useState(() => read("swish_colleges", seedColleges));
  const [currentUser, setCurrentUser] = useState(() => read("swish_current_user", null));
  const [notifications, setNotifications] = useState(() => read("swish_notifications", []));
  const [toast, setToast] = useState("");

  useEffect(() => localStorage.setItem("swish_users", JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem("swish_posts", JSON.stringify(posts)), [posts]);
  useEffect(() => localStorage.setItem("swish_colleges", JSON.stringify(colleges)), [colleges]);
  useEffect(() => localStorage.setItem("swish_current_user", JSON.stringify(currentUser)), [currentUser]);
  useEffect(() => localStorage.setItem("swish_notifications", JSON.stringify(notifications)), [notifications]);

  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const domainApproved = (email) => {
    const domain = "@" + email.split("@")[1]?.toLowerCase();
    return colleges.some(c => c.active && c.domain.toLowerCase() === domain);
  };

  const login = (email, password) => {
    if (email === "admin@swish.com" && password === "admin123") {
      const admin = { id: "admin", name: "SWISH System Admin", email, role: "admin" };
      setCurrentUser(admin);
      notify("Admin login successful");
      return { ok: true, role: "admin" };
    }
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return { ok: false, error: "Invalid email or password." };
    setCurrentUser(user);
    notify(`Welcome back, ${user.name.split(" ")[0]} 👋`);
    return { ok: true, role: user.role };
  };

  const register = (data) => {
    if (!domainApproved(data.email)) return { ok: false, error: "This college email domain is not registered with SWISH." };
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) return { ok: false, error: "An account with this email already exists." };
    const college = colleges.find(c => ("@" + data.email.split("@")[1]).toLowerCase() === c.domain.toLowerCase());
    const user = {
      id: "u" + Date.now(),
      name: data.name,
      username: data.email.split("@")[0],
      email: data.email,
      password: data.password,
      role: data.role,
      designation: data.designation || "",
      college: college?.name || "",
      department: data.department || "",
      year: data.year || "",
      followers: 0,
      following: 0,
      bio: "",
      avatar: data.role === "faculty" ? "👩🏻‍🏫" : "🧑🏻‍🎓"
    };
    setUsers(prev => [...prev, user]);
    setCurrentUser(user);
    notify("Account created successfully 🎉");
    return { ok: true, role: user.role };
  };

  const logout = () => {
    setCurrentUser(null);
    notify("Logged out");
  };

  const createPost = ({ caption, image }) => {
    const post = {
      id: "p" + Date.now(),
      userId: currentUser.id,
      caption,
      image,
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: Date.now()
    };
    setPosts(prev => [post, ...prev]);
    notify("SWISHED ✓");
  };

  const toggleLike = (postId) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const liked = p.likedBy?.includes(currentUser.id);
      return {
        ...p,
        likes: Math.max(0, p.likes + (liked ? -1 : 1)),
        likedBy: liked ? p.likedBy.filter(id => id !== currentUser.id) : [...(p.likedBy || []), currentUser.id]
      };
    }));
  };

  const addComment = (postId, text) => {
    if (!text.trim()) return;
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      comments: [...p.comments, { id: "c" + Date.now(), userId: currentUser.id, text }]
    } : p));
    notify("Comment added");
  };

  const toggleFollow = (targetId) => {
    if (!currentUser || currentUser.id === targetId) return;
    const key = `swish_follow_${currentUser.id}_${targetId}`;
    const following = localStorage.getItem(key) === "1";
    localStorage.setItem(key, following ? "0" : "1");
    setUsers(prev => prev.map(u => u.id === targetId ? { ...u, followers: Math.max(0, u.followers + (following ? -1 : 1)) } : u));
    setCurrentUser(prev => ({ ...prev, following: Math.max(0, prev.following + (following ? -1 : 1)) }));
    notify(following ? "Unfollowed" : "Following");
  };

  const isFollowing = (targetId) => localStorage.getItem(`swish_follow_${currentUser?.id}_${targetId}`) === "1";

  const removePost = (postId) => {
    const target = posts.find(p => p.id === postId);
    if (!target) return;
    const owner = users.find(u => u.id === target.userId);
    if (currentUser.role !== "admin" && (!["faculty"].includes(currentUser.role) || owner?.college !== currentUser.college)) return;
    setPosts(prev => prev.filter(p => p.id !== postId));
    setNotifications(prev => [{ id: Date.now(), message: `Post removed by ${currentUser.name}.` }, ...prev]);
    notify("Post removed by faculty moderator.");
  };

  const updateProfile = (updates) => {
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updates } : u));
    setCurrentUser(prev => ({ ...prev, ...updates }));
    notify("Profile updated ✓");
  };

  const addCollege = (data) => {
    const clean = data.domain.startsWith("@") ? data.domain : "@" + data.domain;
    if (colleges.some(c => c.domain.toLowerCase() === clean.toLowerCase())) return { ok: false, error: "Domain already exists." };
    setColleges(prev => [...prev, { ...data, id: Date.now(), domain: clean, active: true }]);
    notify("College domain activated successfully.");
    return { ok: true };
  };

  const toggleCollege = (id) => setColleges(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));

  const value = useMemo(() => ({
    users, posts, colleges, currentUser, notifications, toast,
    login, register, logout, createPost, toggleLike, addComment, toggleFollow,
    isFollowing, removePost, updateProfile, addCollege, toggleCollege, domainApproved
  }), [users, posts, colleges, currentUser, notifications, toast]);

  return <SwishContext.Provider value={value}>{children}</SwishContext.Provider>;
}

export const useSwish = () => useContext(SwishContext);
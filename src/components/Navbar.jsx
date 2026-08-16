import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSwish } from "../context/SwishContext";

export default function Navbar() {
  const { currentUser, logout } = useSwish();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <Link className="brand" to="/feed"><span>✦</span> SWISH</Link>
      <nav className="desktop-nav">
        <Link to="/feed">Home</Link>
        <Link to="/explore">Explore</Link>
        <Link to="/notifications">Notifications</Link>
      </nav>
      <div className="nav-user">
        <Link to="/profile">{currentUser?.avatar} {currentUser?.name?.split(" ")[0]}</Link>
        {currentUser?.role === "admin" && <button onClick={() => navigate("/admin")}>Admin</button>}
        <button className="ghost-btn" onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
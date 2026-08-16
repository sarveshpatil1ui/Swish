import React from "react";
import { Link } from "react-router-dom";
export default function MobileNavigation() {
  return <nav className="mobile-nav">
    <Link to="/feed">⌂<span>Home</span></Link>
    <Link to="/explore">⌕<span>Explore</span></Link>
    <Link className="create-nav" to="/feed">＋<span>Create</span></Link>
    <Link to="/notifications">♡<span>Alerts</span></Link>
    <Link to="/profile">◉<span>Profile</span></Link>
  </nav>;
}
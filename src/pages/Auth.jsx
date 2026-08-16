import React from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSwish } from "../context/SwishContext";

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, domainApproved } = useSwish();
  const [mode, setMode] = useState(new URLSearchParams(location.search).get("mode") === "login" ? "login" : "signup");
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(null);

  const change = e => {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
    if (e.target.name === "email" && e.target.value.includes("@")) setVerified(domainApproved(e.target.value));
  };

  const submit = e => {
    e.preventDefault(); setError("");
    if (mode === "login") {
      const r = login(form.email, form.password);
      if (!r.ok) return setError(r.error);
      navigate(r.role === "admin" ? "/admin" : "/feed");
    } else {
      if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
      const r = register({ ...form, role });
      if (!r.ok) return setError(r.error);
      navigate("/feed");
    }
  };

  return <div className="auth-page">
    <div className="auth-art"><Link className="brand" to="/">✦ SWISH</Link><div><span>YOUR CAMPUS.</span><span>YOUR PEOPLE.</span><span>YOUR SWISH.</span></div><p>Private. Verified. Built for college communities.</p></div>
    <div className="auth-panel">
      <Link className="back" to="/">← Back</Link>
      <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>LOGIN</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>SIGN UP</button></div>
      {mode === "signup" && <div className="role-switch"><button className={role === "student" ? "active" : ""} onClick={() => setRole("student")}>Student</button><button className={role === "faculty" ? "active" : ""} onClick={() => setRole("faculty")}>Faculty</button></div>}
      <h1>{mode === "login" ? "Welcome back." : "Join your campus."}</h1>
      <p className="muted">{mode === "login" ? "Use your approved campus account." : "Only verified institutional email domains can join SWISH."}</p>
      <form onSubmit={submit}>
        {mode === "signup" && <input name="name" required placeholder="Full Name" onChange={change}/>}
        <input name="email" required type="email" placeholder="College Email" onChange={change}/>
        {mode === "signup" && form.email?.includes("@") && <div className={verified ? "verified" : "error"}>{verified ? "✓ Campus domain verified" : "✕ This college email domain is not registered with SWISH."}</div>}
        <input name="password" required type="password" placeholder="Password" onChange={change}/>
        {mode === "signup" && <input name="confirmPassword" required type="password" placeholder="Confirm Password" onChange={change}/>}
        {mode === "signup" && role === "student" && <>
          <input name="studentId" placeholder="Student ID / Roll Number" onChange={change}/>
          <input name="department" placeholder="Department" onChange={change}/>
          <select name="year" onChange={change}><option value="">Select Year</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select>
        </>}
        {mode === "signup" && role === "faculty" && <>
          <select name="designation" onChange={change}><option value="">Designation</option><option>HOD</option><option>Professor</option><option>Assistant Professor</option><option>Lecturer</option><option>Other</option></select>
          <input name="department" placeholder="Department" onChange={change}/>
          <input name="employeeId" placeholder="Employee ID" onChange={change}/>
        </>}
        {error && <div className="error">{error}</div>}
        <button className="primary full">{mode === "login" ? "LOGIN →" : "CREATE ACCOUNT →"}</button>
      </form>
      <div className="demo-box">
        <b>DEMO ACCOUNTS</b>
        <span>Student: student@abc.edu.in / student123</span>
        <span>Faculty: faculty@abc.edu.in / faculty123</span>
        <span>Admin: admin@swish.com / admin123</span>
      </div>
      <small className="admin-note">There is exactly one preconfigured System Admin. Admin signup is not available.</small>
    </div>
  </div>;
}
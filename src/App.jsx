import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSwish } from "./context/SwishContext";
import Navbar from "./components/Navbar";
import MobileNavigation from "./components/MobileNavigation";
import Toast from "./components/Toast";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/AdminDashboard";
import Colleges from "./pages/Colleges";
import Moderation from "./pages/Moderation";

function Protected({ children, roles }) {
  const { currentUser } = useSwish();
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/feed" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/feed" element={<Protected><><Navbar/><Feed/><MobileNavigation/></></Protected>} />
        <Route path="/explore" element={<Protected><><Navbar/><Explore/><MobileNavigation/></></Protected>} />
        <Route path="/profile/:id" element={<Protected><><Navbar/><Profile/><MobileNavigation/></></Protected>} />
        <Route path="/profile" element={<Protected><><Navbar/><Profile/><MobileNavigation/></></Protected>} />
        <Route path="/notifications" element={<Protected><><Navbar/><Notifications/><MobileNavigation/></></Protected>} />
        <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard/></Protected>} />
        <Route path="/admin/colleges" element={<Protected roles={["admin"]}><Colleges/></Protected>} />
        <Route path="/admin/moderation" element={<Protected roles={["admin"]}><Moderation/></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  );
}
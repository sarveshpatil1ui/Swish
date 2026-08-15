import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import MobileNavigation from '../components/layout/MobileNavigation';
import './MainLayout.css';

const MainLayout = ({ children, currentUser, onLogout }) => {
  return (
    <div className="main-layout">
      <Sidebar currentUser={currentUser} />
      <main className="main-layout__content">
        <div className="main-layout__container">
          {children}
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
};

export default MainLayout;
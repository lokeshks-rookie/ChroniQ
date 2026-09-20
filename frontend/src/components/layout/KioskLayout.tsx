import React from 'react';
import { Outlet } from 'react-router-dom';

export const KioskLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-screen bg-base text-ink overflow-x-hidden font-sans kiosk-screen">
      <Outlet />
    </div>
  );
};

import React from 'react';
import { Outlet } from 'react-router-dom';

export const DisplayLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-screen bg-ink text-base overflow-hidden select-none font-sans on-dark">
      <Outlet />
    </div>
  );
};

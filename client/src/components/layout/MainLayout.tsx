import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ToastContainer } from '@/components/ui/Toast';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  showSearch?: boolean;
}

export const MainLayout = ({ children, title, showSearch = false }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-bg">
      <OfflineBanner />
      <ToastContainer />
      
      <Sidebar />
      
      <div className="md:ml-64">
        <TopBar title={title} showSearch={showSearch} />
        
        <main className="px-4 py-4 md:px-6 md:py-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      <BottomNav />
    </div>
  );
};
import React from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div data-cmp="Layout" className="min-h-screen flex flex-col w-full relative overflow-x-hidden">
      {/* Decorative background blobs for playful feel */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-secondary/20 blur-3xl opacity-60" />
        <div className="absolute top-[20%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-primary/10 blur-3xl opacity-50" />
      </div>
      
      <Header />
      <main className="flex-grow w-full max-w-[1440px] mx-auto flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
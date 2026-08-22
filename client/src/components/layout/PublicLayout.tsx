import { Header } from './Header';
import { Footer } from './Footer';
import { Outlet } from 'react-router';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between overflow-y-auto lg:h-screen lg:max-h-screen lg:overflow-hidden bg-background text-text transition-colors duration-200">
      <Header />

      <main 
        id="main-content" 
        className="flex-1 w-full flex items-center justify-center p-3 sm:p-4 overflow-y-auto lg:overflow-hidden focus-visible:outline-none"
        tabIndex={-1}
      >
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
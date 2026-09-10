import React from 'react';
import { RouterProvider, useRouter } from './context/RouterContext.js';
import { AuthProvider } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { CustomerNavbar } from './components/layout/Navbar.js';
import { CustomerFooter } from './components/layout/Footer.js';

// Customer Pages
import { HomePage } from './pages/HomePage.js';
import { HotelsPage } from './pages/HotelsPage.js';
import { HotelDetailPage } from './pages/HotelDetailPage.js';
import { PackagesPage } from './pages/PackagesPage.js';
import { PackageDetailPage } from './pages/PackageDetailPage.js';
import { FlightsPage } from './pages/FlightsPage.js';
import { MyInquiriesPage } from './pages/MyInquiriesPage.js';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { AdminHotels } from './pages/admin/AdminHotels.js';
import { AdminPackages } from './pages/admin/AdminPackages.js';
import { AdminInquiries } from './pages/admin/AdminInquiries.js';
import { AdminStaff } from './pages/admin/AdminStaff.js';
import { AdminCities } from './pages/admin/AdminCities.js';
import { AdminReviews } from './pages/admin/AdminReviews.js';
import { AdminSettings } from './pages/admin/AdminSettings.js';

// Staff Pages
import { StaffLoginPage } from './pages/staff/StaffLoginPage.js';
import { StaffPortalPage } from './pages/staff/StaffPortalPage.js';

const AppContent: React.FC = () => {
  const { path } = useRouter();
  const cleanPath = (path.split('?')[0].split('#')[0].replace(/\/+$/, '')) || '/';

  // Handle Dedicated Staff Portal Routes
  if (cleanPath.startsWith('/staff')) {
    if (cleanPath === '/staff/login') {
      return <StaffLoginPage />;
    }
    return <StaffPortalPage />;
  }

  // Handle Admin Portal Routes
  if (cleanPath.startsWith('/admin')) {
    if (cleanPath === '/admin/login') {
      return <AdminLoginPage />;
    }
    if (cleanPath === '/admin/hotels') {
      return <AdminHotels />;
    }
    if (cleanPath === '/admin/packages') {
      return <AdminPackages />;
    }
    if (cleanPath === '/admin/inquiries') {
      return <AdminInquiries />;
    }
    if (cleanPath === '/admin/staff') {
      return <AdminStaff />;
    }
    if (cleanPath === '/admin/cities') {
      return <AdminCities />;
    }
    if (cleanPath === '/admin/reviews') {
      return <AdminReviews />;
    }
    if (cleanPath === '/admin/settings') {
      return <AdminSettings />;
    }
    // Default admin fallback
    return <AdminDashboard />;
  }

  // Handle Dynamic Hotel Detail Route `/hotel/:id`
  if (cleanPath.startsWith('/hotel/')) {
    const hotelId = cleanPath.replace('/hotel/', '').split('/')[0];
    return (
      <div className="flex flex-col min-h-screen bg-[#fdfbf7]">
        <CustomerNavbar />
        <main className="flex-1">
          <HotelDetailPage hotelId={hotelId} />
        </main>
        <CustomerFooter />
      </div>
    );
  }

  // Handle Dynamic Package Detail Route `/package/:id`
  if (cleanPath.startsWith('/package/')) {
    const packageId = cleanPath.replace('/package/', '').split('/')[0];
    return (
      <div className="flex flex-col min-h-screen bg-[#fdfbf7]">
        <CustomerNavbar />
        <main className="flex-1">
          <PackageDetailPage packageId={packageId} />
        </main>
        <CustomerFooter />
      </div>
    );
  }

  // Render Customer Portal Pages
  const renderCustomerPage = () => {
    if (cleanPath === '/hotels' || cleanPath.startsWith('/hotels')) {
      return <HotelsPage />;
    }
    if (cleanPath === '/packages' || cleanPath.startsWith('/packages')) {
      return <PackagesPage />;
    }
    if (cleanPath === '/flights' || cleanPath.startsWith('/flights')) {
      return <FlightsPage />;
    }
    if (cleanPath === '/my-inquiries' || cleanPath.startsWith('/my-inquiries')) {
      return <MyInquiriesPage />;
    }
    return <HomePage />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-[#0f294a]">
      <CustomerNavbar />
      <main className="flex-1">
        {renderCustomerPage()}
      </main>
      <CustomerFooter />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

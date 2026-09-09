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

  // Handle Dedicated Staff Portal Routes
  if (path.startsWith('/staff')) {
    if (path === '/staff/login') {
      return <StaffLoginPage />;
    }
    return <StaffPortalPage />;
  }

  // Handle Admin Portal Routes
  if (path.startsWith('/admin')) {
    if (path === '/admin/login') {
      return <AdminLoginPage />;
    }
    if (path === '/admin/hotels') {
      return <AdminHotels />;
    }
    if (path === '/admin/packages') {
      return <AdminPackages />;
    }
    if (path === '/admin/inquiries') {
      return <AdminInquiries />;
    }
    if (path === '/admin/staff') {
      return <AdminStaff />;
    }
    if (path === '/admin/cities') {
      return <AdminCities />;
    }
    if (path === '/admin/reviews') {
      return <AdminReviews />;
    }
    if (path === '/admin/settings') {
      return <AdminSettings />;
    }
    // Default admin fallback
    return <AdminDashboard />;
  }

  // Handle Dynamic Hotel Detail Route `/hotel/:id`
  if (path.startsWith('/hotel/')) {
    const hotelId = path.replace('/hotel/', '').split('?')[0];
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
  if (path.startsWith('/package/')) {
    const packageId = path.replace('/package/', '').split('?')[0];
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
    switch (path) {
      case '/hotels':
        return <HotelsPage />;
      case '/packages':
        return <PackagesPage />;
      case '/flights':
        return <FlightsPage />;
      case '/my-inquiries':
        return <MyInquiriesPage />;
      case '/':
      default:
        return <HomePage />;
    }
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

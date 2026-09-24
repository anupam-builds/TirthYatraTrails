import React from 'react';
import { AdminLayout } from './AdminLayout.js';
import { AdminAccessPortal } from '../../components/AdminAccessPortal.js';

export const AdminAccessPage: React.FC = () => {
  return (
    <AdminLayout activeTab="admins">
      <AdminAccessPortal />
    </AdminLayout>
  );
};

export default AdminAccessPage;

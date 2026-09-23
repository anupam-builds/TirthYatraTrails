import React from 'react';
import { AdminLayout } from './AdminLayout.js';
import { StaffAccess } from '../../components/StaffAccess.js';

export const AdminStaff: React.FC = () => {
  return (
    <AdminLayout activeTab="staff">
      <StaffAccess />
    </AdminLayout>
  );
};

export default AdminStaff;

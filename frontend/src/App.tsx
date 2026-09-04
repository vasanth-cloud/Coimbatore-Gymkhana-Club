import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedLayout } from './components/ProtectedLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { EntryScanner } from './pages/EntryScanner';
import { Products } from './pages/Products';
import { Stock } from './pages/Stock';
import { Sales } from './pages/Sales';
import { Reports } from './pages/Reports';
import { Staff } from './pages/Staff';
import { Attendance } from './pages/Attendance';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes for ADMIN */}
            <Route element={<ProtectedLayout allowedRoles={['ADMIN']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/staff" element={<Staff />} />
            </Route>

            {/* Protected Routes for STAFF & ADMIN */}
            <Route element={<ProtectedLayout allowedRoles={['ADMIN', 'STAFF']} />}>
              <Route path="/customers" element={<Customers />} />
              <Route path="/entries" element={<EntryScanner />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/reports" element={<Reports />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;

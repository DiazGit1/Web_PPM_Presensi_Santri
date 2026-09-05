import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { SWRConfig } from 'swr';
import api from './lib/axios';

import { LoginForm as LoginPage } from './components/layout/LoginForm';
import ScannerPage from './pages/scan/page';
import { DashboardShell as DashboardLayout } from './components/layout/DashboardShell';
import DashboardHome from './pages/(dashboard)/dashboard/page';
import StudentsPage from './pages/(dashboard)/students/page';
import SessionsPage from './pages/(dashboard)/sessions/page';
import AttendancePage from './pages/(dashboard)/attendance/page';
import RecapPage from './pages/(dashboard)/recap/page';
import OperatorsPage from './pages/(dashboard)/operators/page';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <SWRConfig 
      value={{
        fetcher: (url: string) => api.get(url).then(res => res.data)
      }}
    >
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/scan" element={<ScannerPage />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardHome />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="sessions" element={<SessionsPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="recap" element={<RecapPage />} />
                <Route path="operators" element={<OperatorsPage />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </SWRConfig>
  );
}

export default App;

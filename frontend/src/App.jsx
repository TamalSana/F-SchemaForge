import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectView from './pages/ProjectView';
import SchemaDesigner from './pages/SchemaDesigner';
import SQLPreview from './pages/SQLPreview';
import DataManagement from './pages/DataManagement';
import AdminPanel from './pages/AdminPanel';
import AdminUserManagement from './pages/AdminUserManagement';
import SQLHistory from './pages/SQLHistory';
import ProjectPermissions from './pages/ProjectPermissions';
import ChangeCredentials from './pages/ChangeCredentials';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/project/:id/history" element={<ProtectedRoute><SQLHistory /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUserManagement /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
            <Route path="/project/:id" element={<ProtectedRoute><ProjectView /></ProtectedRoute>} />
            <Route path="/project/:id/schema" element={<ProtectedRoute><SchemaDesigner /></ProtectedRoute>} />
            <Route path="/project/:id/sql-preview" element={<ProtectedRoute><SQLPreview /></ProtectedRoute>} />
            <Route path="/project/:id/data" element={<ProtectedRoute><DataManagement /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
            <Route path="/project/:id/permissions" element={<ProtectedRoute><ProjectPermissions /></ProtectedRoute>} />
            <Route path="/change-credentials" element={<ProtectedRoute><ChangeCredentials /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
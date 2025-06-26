import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CozinhaDashboard from './pages/CozinhaDashboard';
import PedidosDashboard from './pages/PedidosDashboard';
import MotoboyDashboard from './pages/MotoboyDashboard';
import AtendenteDashboard from './pages/AtendenteDashboard';
import PedidoPublico from './pages/PedidoPublico';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requiredRole={["admin", "admin_pizzaria"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/cozinha" 
              element={
                <ProtectedRoute requiredRole="cozinha">
                  <CozinhaDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/pedidos" 
              element={
                <ProtectedRoute requiredRole={["admin", "admin_pizzaria", "atendente"]}>
                  <PedidosDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/motoboy" 
              element={
                <ProtectedRoute requiredRole="motoboy">
                  <MotoboyDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/atendente" 
              element={
                <ProtectedRoute requiredRole="atendente">
                  <AtendenteDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Rota pública para pedidos */}
            <Route path="/pedido" element={<PedidoPublico />} />
            <Route path="/pedido/:pizzariaId" element={<PedidoPublico />} />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
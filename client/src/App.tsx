import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { LoginForm } from './components/auth/LoginForm';
import { PrivateRoute } from './components/common/PrivateRoute';
import { useAuth } from './hooks/useAuth';
import SecurityRoutes from './routes/SecurityRoutes';

const { Content } = Layout;

const App: React.FC = () => {
    const { user } = useAuth();

    return (
        <Router>
            <Layout className="min-h-screen">
                <Content>
                    <Routes>
                        {/* Routes publiques */}
                        <Route
                            path="/login"
                            element={
                                !user ? (
                                    <LoginForm />
                                ) : (
                                    <Navigate to="/security" replace />
                                )
                            }
                        />

                        {/* Routes de sécurité */}
                        <Route
                            path="/security/*"
                            element={
                                <PrivateRoute>
                                    <SecurityRoutes />
                                </PrivateRoute>
                            }
                        />

                        {/* Redirection par défaut */}
                        <Route
                            path="/"
                            element={<Navigate to={user ? "/security" : "/login"} replace />}
                        />
                    </Routes>
                </Content>
            </Layout>
        </Router>
    );
};

export default App;

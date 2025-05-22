import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  Outlet,
} from "react-router-dom";

import Navbar from "./components/navbar.jsx";
import Login from "./components/login.jsx";
import Register from "./components/register.jsx";
import Dashboard from "./components/dashboard.jsx";
import AddExpense from "./components/addExpense.jsx";
import MyExpenses from "./components/myExpenses.jsx";
import Summary from "./components/summary.jsx";
import AmountPaid from "./components/amountPaid.jsx";
import PaymentHistory from "./components/paymentHistory.jsx";
import ChangePassword from "./components/changePassword.jsx";
import ReceiptViewer from "./components/receiptViewer.jsx";
import UserManagement from "./components/userManagement.jsx";
import ForgotPassword from "./components/forgotPassword.jsx";

const Layout = ({ children }) => {
  const location = useLocation();
  const publicRoutes = ["/login", "/forgot-password"];

  return (
    <>
      {!publicRoutes.includes(location.pathname) && <Navbar />}
      {children}
    </>
  );
};

// Protected route component that checks for authentication
const ProtectedRoute = () => {
  const userData = localStorage.getItem("userData");
  const location = useLocation();

  // If user is not logged in, redirect to login page
  if (!userData) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is logged in, render the child routes
  return <Outlet />;
};

const App = () => {
  const userData = localStorage.getItem("userData");

  return (
    <Router>
      <Layout>
        <Routes>
          {" "}
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/add-expense" element={<AddExpense />} />
            <Route path="/my-expenses" element={<MyExpenses />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/amount-paid" element={<AmountPaid />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/payment-history" element={<PaymentHistory />} />
            <Route path="/receipt/:id" element={<ReceiptViewer />} />
            <Route path="/user-management" element={<UserManagement />} />
          </Route>
          {/* Default route */}
          <Route
            path="/"
            element={
              userData ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            }
          />
          {/* Catch all other routes and redirect to login/dashboard based on auth state */}
          <Route
            path="*"
            element={
              userData ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;

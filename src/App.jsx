import { Toaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import Layout from './components/Layout';
import AuthScreen from "./components/AuthScreen";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Home from './pages/Home';
import AddExpense from './pages/AddExpense';
import Expenses from './pages/Expenses';
import EditExpense from './pages/EditExpense';
import Reports from './pages/Reports';

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddExpense />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/edit-expense" element={<EditExpense />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function AppContent() {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <AppRoutes />;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppContent />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
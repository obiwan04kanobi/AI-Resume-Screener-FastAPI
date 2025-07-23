import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Home from './components/Home';
import HRDashboard from './components/DashBoard';
import StudentResumeForm from './components/StudentResumeForm';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { getCurrentUser } from 'aws-amplify/auth';
import JobPostingForm from './components/JobPosting';
import '@aws-amplify/ui-react/styles.css';
import Navbar from './components/Navbar';
import awsExports from './aws-exports';
import JobListing from './components/JobListing';
import ManageJobs from './components/ManageJobs';
import SendForReview from './components/SendForReview';
import ReviewerPage from './components/ReviewerPage';
// START: IMPORT THE NEW COMPONENT
import CandidateDatabase from './components/CandidateDatabase';
// END: IMPORT THE NEW COMPONENT

// Configure Amplify
Amplify.configure(awsExports);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/hr-login" replace />;
  }

  return children;
};

// HR Login Component with Cognito UI
const HRLogin = () => {
  return (
    <div className="min-h-screen  flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">HR Login</h2>
          <p className="text-white mt-2">Sign in to access the dashboard</p>
        </div>
        <Authenticator
          hideSignUp={false}
          components={{
            Header() {
              return (
                <div className="text-center mb-4">

                </div>
              );
            }
          }}
        >
          {({ signOut, user }) => (
            <Navigate to="/dashboard" replace />
          )}
        </Authenticator>
      </div>
    </div>
  );
};

// App.jsx (Corrected)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public Routes --- */}
        <Route path="/" element={<Home />} />
        <Route path="/studentform" element={<StudentResumeForm />} />
        <Route path="/job-listings" element={<JobListing />} />
        
        {/* The ReviewerPage MUST be public so external reviewers can access it */}
        <Route path="/review" element={<ReviewerPage />} />

        {/* --- HR Authentication Route --- */}
        <Route path="/hr-login" element={<HRLogin />} />
        
        {/* --- Protected HR Routes --- */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <HRDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* START: ADDED ROUTE FOR CANDIDATE DATABASE */}
        <Route
          path="/candidate-database"
          element={
            <ProtectedRoute>
              <CandidateDatabase />
            </ProtectedRoute>
          }
        />
        {/* END: ADDED ROUTE FOR CANDIDATE DATABASE */}

        <Route
          path="/navbar"
          element={
            <ProtectedRoute>
              <Navbar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post-job"
          element={
            <ProtectedRoute>
              <JobPostingForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-jobs"
          element={
            <ProtectedRoute>
              <ManageJobs />
            </ProtectedRoute>
          }
        />
        {/* The /send-review route is removed as it's not a page */}

        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

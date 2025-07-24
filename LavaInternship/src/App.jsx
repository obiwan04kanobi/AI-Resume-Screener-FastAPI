import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import HRDashboard from './components/DashBoard';
import StudentResumeForm from './components/StudentResumeForm';
import JobPostingForm from './components/JobPosting';
import JobListing from './components/JobListing';
import ManageJobs from './components/ManageJobs';
import ReviewerPage from './components/ReviewerPage';
import CandidateDatabase from './components/CandidateDatabase';
import AuthPage from './components/AuthPage';
import SmartPost from './components/SmartPost'

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  if (!token) { return <Navigate to="/hr-login" replace />; }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public Routes --- */}
        <Route path="/" element={<Home />} />

        {/* FIX: Route now requires a jobId */}
        <Route path="/studentform/:jobId" element={<StudentResumeForm />} />

        <Route path="/job-listings/:jobId?" element={<JobListing />} />
        <Route path="/review" element={<ReviewerPage />} />

        {/* --- HR Authentication Route --- */}
        <Route path="/hr-login" element={<AuthPage />} />

        {/* --- Protected HR Routes --- */}
        <Route path="/dashboard" element={<ProtectedRoute><HRDashboard /></ProtectedRoute>} />
        <Route path="/candidate-database" element={<ProtectedRoute><CandidateDatabase /></ProtectedRoute>} />
        <Route path="/smart-post" element={<ProtectedRoute><SmartPost/></ProtectedRoute>}/>
        <Route path="/post-job" element={<ProtectedRoute><JobPostingForm /></ProtectedRoute>} />
        <Route path="/manage-jobs" element={<ProtectedRoute><ManageJobs /></ProtectedRoute>} />

        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import HRDashboard from './components/DashBoard';
import StudentResumeForm from './components/StudentResumeForm';
// REMOVED: No longer need to import JobPostingForm or SmartPost directly here
import JobListing from './components/JobListing';
import ManageJobs from './components/ManageJobs';
import ReviewerPage from './components/ReviewerPage';
import CandidateDatabase from './components/CandidateDatabase';
import JobPostingForm from './components/JobPosting';
import AuthPage from './components/AuthPage';
<<<<<<< HEAD
// ADDED: Import the new parent component that controls the flow
import CreateJobPage from './components/CreateJobPage'; 
=======
// import SmartPost from './components/SmartPost'
import ImportJob from './components/ImportJob';
>>>>>>> e8a40493d3ed2d9a4f6da8e55ed9da6286ffa84b

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
        <Route path="/studentform/:jobId" element={<StudentResumeForm />} />
        <Route path="/job-listings/:jobId?" element={<JobListing />} />
        <Route path="/review" element={<ReviewerPage />} />

        {/* --- HR Authentication Route --- */}
        <Route path="/hr-login" element={<AuthPage />} />

        {/* --- Protected HR Routes --- */}
        <Route path="/dashboard" element={<ProtectedRoute><HRDashboard /></ProtectedRoute>} />
        <Route path="/candidate-database" element={<ProtectedRoute><CandidateDatabase /></ProtectedRoute>} />
<<<<<<< HEAD
        
        {/* CHANGED: The "/post-job" route now renders the CreateJobPage component */}
 
<Route path="/smart-post" element={<ProtectedRoute><CreateJobPage /></ProtectedRoute>} />
        
        {/* REMOVED: The "/smart-post" route is no longer needed as it's part of the "/post-job" flow */}
        
=======
        {/* <Route path="/smart-post" element={<ProtectedRoute><SmartPost/></ProtectedRoute>}/> */}
        <Route path="/post-job" element={<ProtectedRoute><JobPostingForm /></ProtectedRoute>} />
>>>>>>> e8a40493d3ed2d9a4f6da8e55ed9da6286ffa84b
        <Route path="/manage-jobs" element={<ProtectedRoute><ManageJobs /></ProtectedRoute>} />
        <Route path="/import-job" element={<ProtectedRoute><ImportJob /></ProtectedRoute>}/>
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

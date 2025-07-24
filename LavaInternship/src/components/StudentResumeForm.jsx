import React, { useState, useEffect } from "react";
// FIX: Import useParams to read the jobId from the URL
import { useNavigate, useParams } from "react-router-dom";

const StudentResumeForm = () => {
  const navigate = useNavigate();
  // FIX: Get the jobId from the URL parameters
  const { jobId } = useParams();

  const [jobInfo, setJobInfo] = useState({ jobId: null, jobTitle: 'Loading...' });
  const [toastVisible, setToastVisible] = useState(false);
  const [errors, setErrors] = useState({});

  // FIX: Fetch job details when the component loads
  useEffect(() => {
    if (jobId) {
        const fetchJobDetails = async () => {
            try {
                const res = await fetch(`http://localhost:8000/jobs/${jobId}`);
                if (!res.ok) {
                    throw new Error("Job not found");
                }
                const jobData = await res.json();
                setJobInfo({ jobId: jobData.job_id, jobTitle: jobData.jobTitle });
            } catch (error) {
                console.error("Failed to fetch job details:", error);
                // If job doesn't exist, redirect to job listings
                navigate('/job-listings');
            }
        };
        fetchJobDetails();
    } else {
        // If no jobId in URL, redirect
        navigate('/job-listings');
    }
  }, [jobId, navigate]);

  const apiEndpoint = "http://localhost:8000/candidates/apply";

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ... (rest of the validation and submission logic remains the same)

    const now = new Date();
    const submittedAt = now.toISOString();
    const file = e.target.resume.files[0];

    const formData = {
      name: e.target.name.value.trim(),
      email: e.target.email.value.trim(),
      contact: e.target.contact.value.trim(),
      experience: e.target.experience.value,
      pass12: e.target.pass12.value ? parseInt(e.target.pass12.value, 10) : null,
      gradYear: e.target.gradYear.value ? parseInt(e.target.gradYear.value, 10) : null,
      marks12: e.target.marks12.value || null,
      gradMarks: e.target.gradMarks.value || null,
      gender: e.target.Gender.value,
      workPref: e.target.workPref.value,
      age: parseInt(e.target.age.value, 10),
      linkedIn: e.target.linkedIn.value.trim() || null,
      address: e.target.address.value.trim(),
      resume: file?.name || "",
      jobId: jobInfo.jobId,
      jobTitle: jobInfo.jobTitle,
      submittedAt: submittedAt,
    };
    
    // Client-side validation before submission (optional but good practice)
    // ...

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) {
        const error = new Error("Server responded with an error.");
        error.response = { data: result }; 
        throw error;
      }

      if (!result.upload_url) throw new Error("No upload URL received");

      await fetch(result.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
        navigate('/job-listings'); // Go back to listings after successful submission
      }, 3000);
      e.target.reset();
      setErrors({});
    } catch (err) {
      if (err.response && err.response.data) {
        console.error("🚨 Validation error:", err.response.data);
        const errorDetails = JSON.stringify(err.response.data.detail, null, 2);
        alert(`Submission Error:\n${errorDetails}`);
      } else {
        console.error("🚨 Submission error:", err);
        alert("Error: " + err.message);
      }
    }
  };

  // The JSX for your form remains the same, no changes needed there
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-lg p-8 w-full max-w-4xl" style={{ maxHeight: "95vh", overflowY: "auto" }}>
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6">
          Job Application Form
          {jobInfo.jobTitle && (
            <div className="text-lg font-normal text-blue-600 mt-2">
              Applying for: {jobInfo.jobTitle}
            </div>
          )}
        </h2>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* All your form inputs go here, they don't need to be changed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div><label className="block font-semibold text-gray-700 mb-1">Full Name *</label><input type="text" name="name" placeholder="Enter your full name" className={`w-full border-2 ${errors.name ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required /></div>
                <div><label className="block font-semibold text-gray-700 mb-1">Email Address *</label><input type="email" name="email" placeholder="example@email.com" className={`w-full border-2 ${errors.email ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required /></div>
                <div><label className="block font-semibold text-gray-700 mb-1">Contact Number *</label><input type="tel" name="contact" placeholder="10-digit mobile number" className={`w-full border-2 ${errors.contact ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required /></div>
                <div><label className="block font-semibold text-gray-700 mb-1">Gender *</label><select name="Gender" className={`w-full border-2 ${errors.Gender ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required defaultValue=""><option value="" disabled>Select Gender</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></div>
                <div><label className="block font-semibold text-gray-700 mb-1">Experience Range *</label><select name="experience" className={`w-full border-2 ${errors.experience ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required defaultValue=""><option value="" disabled>Select Experience</option><option value="0-1 Year">0-1 Year</option><option value="1-5 Years">1-5 Years</option><option value="5-10 Years">5-10 Years</option><option value="10+ Years">10+ Years</option></select></div>
                <div><label className="block font-semibold text-gray-700 mb-1">Work Preference *</label><select name="workPref" className={`w-full border-2 ${errors.workPref ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required defaultValue=""><option value="" disabled>Select Preference</option><option value="Work From Home">Work From Home</option><option value="Office">Office</option><option value="Hybrid">Hybrid</option></select></div>
                <div><label className="block font-semibold text-gray-700 mb-1">Year of Passing 12th</label><input type="number" name="pass12" placeholder="e.g., 2020" min="1990" max={new Date().getFullYear()} className={`w-full border-2 ${errors.pass12 ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} /></div>
                <div><label className="block font-semibold text-gray-700 mb-1">12th Marks (%)</label><input type="number" name="marks12" min="0" max="100" step="0.01" placeholder="e.g., 85.5" className={`w-full border-2 ${errors.marks12 ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} /></div>
                <div><label className="block font-semibold text-gray-700 mb-1">Graduation Year</label><input type="number" name="gradYear" placeholder="e.g., 2024" min="1990" max={new Date().getFullYear() + 6} className={`w-full border-2 ${errors.gradYear ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} /></div>
                <div><label className="block font-semibold text-gray-700 mb-1">Age *</label><input type="number" name="age" required placeholder="e.g., 25" min="18" max="65" className={`w-full border-2 ${errors.age ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} /></div>
                <div><label className="block font-semibold text-gray-700 mb-1">Graduation Marks (%)</label><input type="number" name="gradMarks" min="0" max="100" step="0.01" placeholder="e.g., 75.0" className={`w-full border-2 ${errors.gradMarks ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} /></div>
                <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Address *</label><input type="text" name="address" placeholder="Enter your full address" className={`w-full border-2 ${errors.address ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required /></div>
                <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">LinkedIn Profile URL</label><input type="url" name="linkedIn" placeholder="https://linkedin.com/in/your-profile" className={`w-full border-2 ${errors.linkedIn ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} /></div>
                <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Upload Resume (PDF/DOC, Max 3MB) *</label><input type="file" name="resume" accept=".pdf,.doc,.docx" className={`w-full border-2 ${errors.resume ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`} required /></div>
            </div>
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold shadow-lg">Submit Resume</button>
        </form>
        {jobInfo.jobId && (<div className="mt-4 text-center"><button type="button" onClick={() => navigate("/job-listings")} className="text-blue-600 hover:text-blue-800 font-medium">← Back to Job Listings</button></div>)}
        {toastVisible && (<div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg"><div className="flex items-center"><span className="text-xl mr-2">✅</span><span className="font-semibold">Form submitted successfully!</span></div></div>)}
      </div>
    </div>
  );
};

export default StudentResumeForm;
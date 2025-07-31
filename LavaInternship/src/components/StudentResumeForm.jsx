import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from 'axios';

const StudentResumeForm = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [jobInfo, setJobInfo] = useState({ jobId: null, jobTitle: 'Loading...' });
  const [toastVisible, setToastVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillStatus, setAutofillStatus] = useState(''); // For user feedback
  const [formData, setFormData] = useState({
    name: '', email: '', contact: '', gender: '', currentCtc: '', currentCompany: ''
  });
  const [resumeFile, setResumeFile] = useState(null);
  const fileInputRef = useRef(null);

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
          navigate('/job-listings');
        }
      };
      fetchJobDetails();
    } else {
      navigate('/job-listings');
    }
  }, [jobId, navigate]);

  const apiEndpoint = "http://localhost:8000/candidates/apply";
  const autofillEndpoint = "http://localhost:8000/candidates/parse-autofill";

  // Validation functions (keep existing ones)
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) =>
    /^[6-9]\d{9}$/.test(phone.trim().replace(/[\s\-()]/g, ""));
  const validateFile = (file) => {
    if (!file) return { valid: false, message: "Please select a file" };
    const allowedExtensions = [".pdf", ".docx"];
    const fileName = file.name.toLowerCase();
    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      return {
        valid: false,
        message: "Only PDF and DOCX files are allowed",
      };
    }
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 5) {
      return {
        valid: false,
        message: `File size is ${sizeInMB.toFixed(2)} MB. Maximum allowed is 5 MB`,
      };
    }
    return { valid: true, message: "" };
  };

  const validateField = (name, value, file = null) => {
    const newErrors = { ...errors };
    switch (name) {
      case "name":
        if (!value.trim() || value.trim().length < 2)
          newErrors[name] = "Name must be at least 2 characters long";
        else delete newErrors[name];
        break;
      case "gender":
        if (!value) {
          newErrors[name] = `Please select a gender`;
        } else {
          delete newErrors[name];
        }
        break;
      case "email":
        if (!validateEmail(value))
          newErrors[name] = "Please enter a valid email address";
        else delete newErrors[name];
        break;
      case "contact":
        if (!validatePhone(value))
          newErrors[name] = "Please enter a valid 10-digit mobile number";
        else delete newErrors[name];
        break;
      case "currentCtc":
        const ctcValue = parseFloat(value);
        if (!value || isNaN(ctcValue) || ctcValue < 0) {
          newErrors[name] = "Please enter a valid CTC amount (in LPA)";
        } else {
          delete newErrors[name];
        }
        break;
      case "currentCompany":
        if (!value.trim())
          newErrors[name] = "Please enter your current company name";
        else delete newErrors[name];
        break;
      case "resume":
        const fileValidation = validateFile(file);
        if (!fileValidation.valid) {
          newErrors[name] = fileValidation.message;
        } else {
          delete newErrors[name];
        }
        break;
      default:
        break;
    }
    setErrors(newErrors);
    return !newErrors[name];
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setResumeFile(file);
    validateField("resume", null, file);
    setAutofillStatus(''); // Clear previous status
  };

  // Enhanced autofill function
  const handleAutofill = async () => {
    if (!resumeFile) {
      setAutofillStatus("Please select a resume file first.");
      fileInputRef.current.click();
      return;
    }

    const fileValidation = validateFile(resumeFile);
    if (!fileValidation.valid) {
      setErrors(prev => ({ ...prev, resume: fileValidation.message }));
      setAutofillStatus("Please fix the file error before autofilling.");
      return;
    }

    setIsAutofilling(true);
    setAutofillStatus("Analyzing your resume...");

    const autofillFormData = new FormData();
    autofillFormData.append("resume", resumeFile);

    try {
      const res = await axios.post(autofillEndpoint, autofillFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout
      });

      // Check if there's an error in the response
      if (res.data.error) {
        setAutofillStatus(`Analysis failed: ${res.data.error}`);
        return;
      }

      let fieldsUpdated = 0;
      const updatedFields = [];

      // Update form state with extracted data
      setFormData(prev => {
        const newData = { ...prev };

        // Map the extracted data to form fields
        const fieldMappings = {
          'name': 'name',
          'email': 'email',
          'contact': 'contact',
          'current_company': 'currentCompany' // Assumes backend might extract this
        };

        Object.entries(fieldMappings).forEach(([apiField, formField]) => {
          if (res.data[apiField] && res.data[apiField].trim()) {
            newData[formField] = res.data[apiField].trim();
            fieldsUpdated++;
            updatedFields.push(formField);
          }
        });

        return newData;
      });

      // Clear errors for fields that were successfully autofilled
      setErrors(prev => {
        const newErrors = { ...prev };
        updatedFields.forEach(field => {
          if (newErrors[field]) {
            delete newErrors[field];
          }
        });
        return newErrors;
      });

      // Set success status
      if (fieldsUpdated > 0) {
        setAutofillStatus(`✅ Successfully filled ${fieldsUpdated} field(s): ${updatedFields.join(', ')}`);
      } else {
        setAutofillStatus("⚠️ No extractable data found in the resume. Please fill the form manually.");
      }

      // Log extraction method for debugging
      if (res.data._extraction_method) {
        console.log(`Extraction method used: ${res.data._extraction_method}`);
      }

    } catch (err) {
      console.error("Autofill error:", err);

      let errorMessage = "Could not extract data from resume.";

      if (err.code === 'ECONNABORTED') {
        errorMessage = "Analysis timed out. Please try again or fill manually.";
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setAutofillStatus(`❌ Autofill Failed: ${errorMessage}`);
    } finally {
      setIsAutofilling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all required fields before submission
    const requiredFields = ['name', 'email', 'contact', 'gender', 'currentCtc', 'currentCompany'];
    let hasErrors = false;

    for (const field of requiredFields) {
      if (!validateField(field, formData[field])) {
        hasErrors = true;
      }
    }

    if (!resumeFile) {
      setErrors(prev => ({ ...prev, resume: "Please upload a resume." }));
      hasErrors = true;
    }

    if (hasErrors) {
      setAutofillStatus("⚠️ Please fill all required fields before submitting.");
      return;
    }

    // Create FormData from state
    const submissionFormData = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key]) {
        submissionFormData.append(key, formData[key].trim());
      }
    });

    submissionFormData.append("jobId", jobInfo.jobId);
    submissionFormData.append("jobTitle", jobInfo.jobTitle);
    submissionFormData.append("resume", resumeFile);

    try {
      await axios.post(apiEndpoint, submissionFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
        navigate('/job-listings');
      }, 3000);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Name */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your full name"
                className={`w-full border-2 ${errors.name ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                required
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="example@email.com"
                className={`w-full border-2 ${errors.email ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                required
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Contact */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Contact Number *</label>
              <input
                type="tel"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="10-digit mobile number"
                className={`w-full border-2 ${errors.contact ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                required
              />
              {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full border-2 ${errors.gender ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                required
              >
                <option value="" disabled>Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
            </div>

            {/* Current CTC */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Current CTC (LPA) *</label>
              <input
                type="number"
                name="currentCtc"
                value={formData.currentCtc}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., 12.5"
                className={`w-full border-2 ${errors.currentCtc ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                required
              />
              {errors.currentCtc && <p className="text-red-500 text-xs mt-1">{errors.currentCtc}</p>}
            </div>

            {/* Current Company */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Current Company *</label>
              <input
                type="text"
                name="currentCompany"
                value={formData.currentCompany}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your current company name"
                className={`w-full border-2 ${errors.currentCompany ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                required
              />
              {errors.currentCompany && <p className="text-red-500 text-xs mt-1">{errors.currentCompany}</p>}
            </div>

            {/* Resume Upload */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Upload Resume (PDF/DOCX Only, Max 5MB) *</label>
              <div className="flex items-stretch space-x-2">
                <input
                  type="file"
                  name="resume"
                  ref={fileInputRef}
                  accept=".pdf,.docx"
                  className={`flex-grow w-full border-2 ${errors.resume ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
                  required
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={handleAutofill}
                  disabled={isAutofilling || !resumeFile}
                  className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                >
                  {isAutofilling ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    'Smart Autofill'
                  )}
                </button>
              </div>

              {/* Status Messages */}
              {autofillStatus && (
                <div className={`mt-2 p-2 rounded text-sm ${autofillStatus.includes('✅') ? 'bg-green-50 text-green-700' :
                  autofillStatus.includes('❌') ? 'bg-red-50 text-red-700' :
                    autofillStatus.includes('⚠️') ? 'bg-yellow-50 text-yellow-700' :
                      'bg-blue-50 text-blue-700'
                  }`}>
                  {autofillStatus}
                </div>
              )}

              {errors.resume ? (
                <p className="text-red-500 text-xs mt-1">{errors.resume}</p>
              ) : (
                <p className="text-xs text-gray-600 mt-1">
                  Upload your resume and click "Smart Autofill" to automatically populate the form fields.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-colors"
          >
            Submit Application
          </button>
        </form>

        {jobInfo.jobId && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate("/job-listings")}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Job Listings
            </button>
          </div>
        )}

        {toastVisible && (
          <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center">
              <span className="text-xl mr-2">✅</span>
              <span className="font-semibold">Application submitted successfully!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentResumeForm;
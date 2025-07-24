import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const StudentResumeForm = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [jobInfo, setJobInfo] = useState({ jobId: null, jobTitle: 'Loading...' });
  const [toastVisible, setToastVisible] = useState(false);
  const [errors, setErrors] = useState({});

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

  // Validation functions
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) =>
    /^[6-9]\d{9}$/.test(phone.trim().replace(/[\s\-()]/g, ""));

  const validateFile = (file) => {
    if (!file) return { valid: false, message: "Please select a file" };
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const fileName = file.name.toLowerCase();
    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      return {
        valid: false,
        message: "Only PDF, DOC, or DOCX files are allowed",
      };
    }
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 3) {
      return {
        valid: false,
        message: `File size is ${sizeInMB.toFixed(2)} MB. Maximum allowed is 3 MB`,
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
      case "email":
        if (!validateEmail(value))
          newErrors[name] = "Please enter a valid email address";
        else delete newErrors[name];
        break;
      case "contact":
        if (!validatePhone(value))
          newErrors[name] = "Please enter a valid 10-digit Indian mobile number";
        else delete newErrors[name];
        break;
      case "Gender":
      case "workPref":
      case "experience":
        if (!value) {
          let fieldName = "a value";
          if (name === "Gender") fieldName = "a gender";
          else if (name === "workPref") fieldName = "work preference";
          else if (name === "experience") fieldName = "an experience range";
          newErrors[name] = `Please select ${fieldName}`;
        } else {
          delete newErrors[name];
        }
        break;
      case "age":
        const ageValue = parseInt(value, 10);
        if (!value || isNaN(ageValue) || ageValue < 18 || ageValue > 65) {
          newErrors[name] = "Please enter a valid age between 18 and 65";
        } else {
          delete newErrors[name];
        }
        break;
      
      case "pass12":
        const pass12Value = parseInt(value, 10);
        if (value && (isNaN(pass12Value) || pass12Value < 1990)) {
            newErrors[name] = "Year cannot be earlier than 1990";
        } else {
            delete newErrors[name];
        }
        break;

      case "gradYear":
        const gradYearValue = parseInt(value, 10);
        if (value && (isNaN(gradYearValue) || gradYearValue < 1990)) {
            newErrors[name] = "Year cannot be earlier than 1990";
        } else {
            delete newErrors[name];
        }
        break;

      // --- NEW VALIDATION LOGIC FOR MARKS ---
      case "marks12":
        const marks12Value = parseFloat(value);
        if (value && (isNaN(marks12Value) || marks12Value < 1 || marks12Value > 100)) {
            newErrors[name] = "Marks must be between 1 and 100";
        } else {
            delete newErrors[name];
        }
        break;

      case "gradMarks":
        const gradMarksValue = parseFloat(value);
        if (value && (isNaN(gradMarksValue) || gradMarksValue < 1 || gradMarksValue > 100)) {
            newErrors[name] = "Marks must be between 1 and 100";
        } else {
            delete newErrors[name];
        }
        break;
        
      case "resume":
        const fileValidation = validateFile(file);
        if (!fileValidation.valid) {
            newErrors[name] = fileValidation.message;
        } else {
            delete newErrors[name];
        }
        break;
    }

    setErrors(newErrors);
    return !newErrors[name];
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    validateField("resume", null, file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
    
    let localErrors = {};
    Object.keys(formData).forEach(key => {
        if (key === 'resume') {
            const fileValidation = validateFile(file);
            if (!fileValidation.valid) localErrors.resume = fileValidation.message;
        } else {
            validateField(key, formData[key]);
        }
    });

    if (Object.keys(errors).length > 0 || Object.keys(localErrors).length > 0) {
      console.warn("⚠️ Validation failed.", {...errors, ...localErrors});
      return;
    }

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
        navigate('/job-listings');
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
                  <input type="text" name="name" placeholder="Enter your full name" className={`w-full border-2 ${errors.name ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required onBlur={handleBlur} />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                {/* Email */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input type="email" name="email" placeholder="example@email.com" className={`w-full border-2 ${errors.email ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required onBlur={handleBlur} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                {/* Contact */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Contact Number *</label>
                  <input type="tel" name="contact" placeholder="10-digit mobile number" className={`w-full border-2 ${errors.contact ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required onBlur={handleBlur} />
                  {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
                </div>
                {/* Gender */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Gender *</label>
                  <select name="Gender" className={`w-full border-2 ${errors.Gender ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required onBlur={handleBlur} defaultValue="">
                    <option value="" disabled>Select Gender</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                  </select>
                  {errors.Gender && <p className="text-red-500 text-xs mt-1">{errors.Gender}</p>}
                </div>
                {/* Experience Range */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Experience Range *</label>
                  <select name="experience" className={`w-full border-2 ${errors.experience ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required onBlur={handleBlur} defaultValue="">
                    <option value="" disabled>Select Experience</option><option value="0-1 Year">0-1 Year</option><option value="1-5 Years">1-5 Years</option><option value="5-10 Years">5-10 Years</option><option value="10+ Years">10+ Years</option>
                  </select>
                  {errors.experience && <p className="text-red-500 text-xs mt-1">{errors.experience}</p>}
                </div>
                {/* Work Preference */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Work Preference *</label>
                  <select name="workPref" className={`w-full border-2 ${errors.workPref ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required onBlur={handleBlur} defaultValue="">
                    <option value="" disabled>Select Preference</option><option value="Work From Home">Work From Home</option><option value="Office">Office</option><option value="Hybrid">Hybrid</option>
                  </select>
                  {errors.workPref && <p className="text-red-500 text-xs mt-1">{errors.workPref}</p>}
                </div>
                {/* 12th Passing Year */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Year of Passing 12th</label>
                  <input type="number" name="pass12" placeholder="e.g., 2020" className={`w-full border-2 ${errors.pass12 ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} onBlur={handleBlur} />
                  {errors.pass12 && <p className="text-red-500 text-xs mt-1">{errors.pass12}</p>}
                </div>
                {/* 12th Marks */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">12th Marks (%)</label>
                  <input type="number" name="marks12" placeholder="e.g., 85.5" className={`w-full border-2 ${errors.marks12 ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} onBlur={handleBlur} />
                  {errors.marks12 && <p className="text-red-500 text-xs mt-1">{errors.marks12}</p>}
                </div>
                {/* Graduation Year */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Graduation Year</label>
                  <input type="number" name="gradYear" placeholder="e.g., 2024" className={`w-full border-2 ${errors.gradYear ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} onBlur={handleBlur} />
                  {errors.gradYear && <p className="text-red-500 text-xs mt-1">{errors.gradYear}</p>}
                </div>
                {/* Age */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Age *</label>
                  <input type="number" name="age" required placeholder="e.g., 25" min="18" max="65" className={`w-full border-2 ${errors.age ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} onBlur={handleBlur} />
                  {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                </div>
                {/* Graduation Marks */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Graduation Marks (%)</label>
                  <input type="number" name="gradMarks" placeholder="e.g., 75.0" className={`w-full border-2 ${errors.gradMarks ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} onBlur={handleBlur} />
                  {errors.gradMarks && <p className="text-red-500 text-xs mt-1">{errors.gradMarks}</p>}
                </div>
                {/* Address */}
                <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Address *</label><input type="text" name="address" placeholder="Enter your full address" className={`w-full border-2 ${errors.address ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} required onBlur={handleBlur} />{errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}</div>
                {/* LinkedIn */}
                <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">LinkedIn Profile URL</label><input type="url" name="linkedIn" placeholder="https://linkedin.com/in/your-profile" className={`w-full border-2 ${errors.linkedIn ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`} onBlur={handleBlur} />{errors.linkedIn && <p className="text-red-500 text-xs mt-1">{errors.linkedIn}</p>}</div>
                {/* Resume Upload */}
                <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Upload Resume (PDF/DOC, Max 3MB) *</label><input type="file" name="resume" accept=".pdf,.doc,.docx" className={`w-full border-2 ${errors.resume ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`} required onChange={handleFileChange} />{errors.resume ? <p className="text-red-500 text-xs mt-1">{errors.resume}</p> : <p className="text-xs text-gray-600 mt-1">Only PDF, DOC, or DOCX files under 3MB are allowed.</p>}</div>
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

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar'; // Assuming you have a Navbar component

// Helper icon for the upload box
const UploadIcon = () => (
    <svg className="w-12 h-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ImportJob = () => {
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fileName, setFileName] = useState('');
    const [parseError, setParseError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [parsedData, setParsedData] = useState(null); // This will hold the data from the PDF

    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        getValues,
        setValue,
    } = useForm({
        // Use the same default values as your manual form
        defaultValues: {
            jobTitle: '',
            department: '',
            location: '',
            workType: 'Full-time',
            workMode: 'On-site',
            minExperience: '',
            maxExperience: '',
            minSalary: '',
            maxSalary: '',
            currency: 'INR',
            jobDescription: '',
            responsibilities: '',
            requirements: '',
            skills: '',
            applicationDeadline: '',
            // Add any other fields you have
        }
    });

    // When parsedData is received from the backend, populate the form
    useEffect(() => {
        if (parsedData) {
            // The 'reset' function from react-hook-form efficiently populates all fields
            // Your backend should return a JSON object with keys matching your form field names
            reset(parsedData);
        }
    }, [parsedData, reset]);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            setFileName(file.name);
            setParseError('');
            handleParse(file); // Automatically start parsing on file selection
        } else {
            setParseError('Please select a valid PDF file.');
            setFileName('');
        }
    };

    const handleParse = async (file) => {
        setIsParsing(true);
        setParseError('');

        const formData = new FormData();
        formData.append('jobPdf', file);

        try {
            // **IMPORTANT**: You need to create this backend endpoint.
            // It should accept a PDF, process it with Textract, and return structured JSON.
            const PARSE_API_URL = "https://YOUR-API-GATEWAY-URL/parse-job-pdf";
            
            const response = await axios.post(PARSE_API_URL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            // The backend should ideally return data that matches the form structure
            // e.g., { jobTitle: "Software Engineer", skills: "React, Node.js", ... }
            setParsedData(response.data);

        } catch (error) {
            console.error('Error parsing PDF:', error);
            setParseError('Failed to parse PDF. Please check the file or try again.');
            setFileName(''); // Clear filename on error
        } finally {
            setIsParsing(false);
        }
    };

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        // This submission logic is identical to your original form
        try {
            const processedData = {
                ...data,
                minExperience: data.minExperience ? Number(data.minExperience) : null,
                maxExperience: data.maxExperience ? Number(data.maxExperience) : null,
                minSalary: data.minSalary ? Number(data.minSalary) : null,
                maxSalary: data.maxSalary ? Number(data.maxSalary) : null,
                skills: data.skills.split(',').map(skill => skill.trim()).filter(skill => skill),
                requirements: data.requirements.split('\n').filter(req => req.trim()),
                responsibilities: data.responsibilities.split('\n').filter(resp => resp.trim()),
                postedDate: new Date().toISOString(),
                status: 'Active'
            };

            await axios.post('https://7otecyotv1.execute-api.ap-south-1.amazonaws.com/PostJob', processedData);

            setSubmitSuccess(true);
            setTimeout(() => {
                navigate('/dashboard'); // Redirect after success
            }, 2000);

        } catch (error) {
            console.error('Error posting job:', error);
            alert('Failed to post job. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <div className="w-full fixed top-0 left-0 z-50">
                <Navbar />
            </div>
            <div className="flex-grow flex items-center justify-center pt-24 pb-12">
                <div className="bg-white shadow-xl rounded-lg p-8 w-full max-w-4xl mx-auto">
                    
                    <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">Import Job from PDF</h1>
                    <p className="text-center text-gray-500 mb-8">
                        {parsedData ? "Review the parsed details below and submit." : "Upload a job description PDF to auto-fill the form."}
                    </p>

                    {/* STAGE 1: PDF UPLOAD UI */}
                    {!parsedData && (
                        <div className="w-full">
                            <div 
                                className="mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-blue-500 transition-colors"
                                onClick={() => fileInputRef.current.click()}
                            >
                                <div className="space-y-1 text-center">
                                    <UploadIcon />
                                    <div className="flex text-sm text-gray-600">
                                        <p className="pl-1">
                                            {isParsing ? "Analyzing PDF, please wait..." : (fileName ? `Selected: ${fileName}` : "Click to upload a document")}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-500">PDF only, up to 10MB</p>
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={handleFileSelect}
                                disabled={isParsing}
                            />
                            {parseError && <p className="text-red-500 text-sm mt-2 text-center">{parseError}</p>}
                            {isParsing && (
                                <div className="flex justify-center items-center mt-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* STAGE 2: REVIEW AND SUBMIT FORM */}
                    {parsedData && (
                         <>
                            {submitSuccess && (
                                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 text-center">
                                    Job posted successfully! Redirecting...
                                </div>
                            )}
                            {/* Re-using your form structure */}
                            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                                {/* The form fields are the same as your JobPostingForm */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                     {/* Job Title */}
                                     <div>
                                         <label className="block font-semibold text-gray-700 mb-1">Job Title *</label>
                                         <input
                                             {...register('jobTitle', { required: 'Job title is required' })}
                                             className={`w-full border-2 ${errors.jobTitle ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors`}
                                             placeholder="e.g., Senior Software Engineer"
                                         />
                                         {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle.message}</p>}
                                     </div>

                                     {/* Department */}
                                     <div>
                                         <label className="block font-semibold text-gray-700 mb-1">Department *</label>
                                         <select
                                             {...register('department', { required: 'Department is required' })}
                                             className={`w-full border-2 ${errors.department ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors`}
                                         >
                                             <option value="">Select Department</option>
                                             <option value="Engineering">Engineering</option>
                                             <option value="Marketing">Marketing</option>
                                             <option value="Sales">Sales</option>
                                             <option value="HR">Human Resources</option>
                                         </select>
                                         {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
                                     </div>
                                    
                                     {/* Location */}
                                     <div>
                                         <label className="block font-semibold text-gray-700 mb-1">Location *</label>
                                         <input
                                             {...register('location', { required: 'Location is required' })}
                                             className={`w-full border-2 ${errors.location ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors`}
                                             placeholder="e.g., Mumbai, India"
                                         />
                                         {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
                                     </div>

                                     {/* Add other fields here... (Work Type, Experience, Salary, etc.) */}
                                     {/* ... The rest of your form fields go here ... */}


                                    {/* Key Responsibilities */}
                                    <div className="md:col-span-2">
                                        <label className="block font-semibold text-gray-700 mb-1">Key Responsibilities *</label>
                                        <textarea
                                            {...register('responsibilities', { required: 'Responsibilities are required' })}
                                            rows="5"
                                            className={`w-full border-2 ${errors.responsibilities ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors`}
                                            placeholder="List key responsibilities (one per line)"
                                        />
                                        {errors.responsibilities && <p className="text-red-500 text-xs mt-1">{errors.responsibilities.message}</p>}
                                    </div>
                                     
                                    {/* Required Skills */}
                                    <div className="md:col-span-2">
                                        <label className="block font-semibold text-gray-700 mb-1">Required Skills *</label>
                                        <textarea
                                            {...register('skills', { required: 'Skills are required' })}
                                            rows="3"
                                            className={`w-full border-2 ${errors.skills ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors`}
                                            placeholder="Enter skills separated by commas (e.g., JavaScript, React, Node.js)"
                                        />
                                        {errors.skills && <p className="text-red-500 text-xs mt-1">{errors.skills.message}</p>}
                                    </div>

                                </div>
                                
                                <div className="flex justify-end space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setParsedData(null);
                                            setFileName('');
                                            reset();
                                        }}
                                        className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Upload New PDF
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Confirm and Post Job'}
                                    </button>
                                </div>
                            </form>
                         </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportJob;
import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';

// UploadIcon component remains the same
const UploadIcon = () => (
    <svg className="w-12 h-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);


const ImportJob = () => {
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fileName, setFileName] = useState('');
    const [parseError, setParseError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [parsedData, setParsedData] = useState(null);

    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // --- 1. UPDATE useForm TO INCLUDE ERRORS, getValues, AND DEFAULT VALUES ---
    const { register, handleSubmit, formState: { errors }, reset, getValues } = useForm({
        defaultValues: {
            workType: 'Full-time',
            workMode: 'On-site',
            experienceLevel: 'Entry Level',
            currency: 'INR',
            positionsAvailable: 1,
            isUrgent: false,
            travelRequired: false,
            backgroundCheckRequired: false
        }
    });

    // This useEffect is now more powerful. It populates the full form.
    useEffect(() => {
        if (parsedData) {
            // Convert array data back to string for textareas if needed
            const prefillData = {
                ...parsedData,
                responsibilities: Array.isArray(parsedData.responsibilities) ? parsedData.responsibilities.join('\n') : parsedData.responsibilities,
                requirements: Array.isArray(parsedData.requirements) ? parsedData.requirements.join('\n') : parsedData.requirements,
                qualifications: Array.isArray(parsedData.qualifications) ? parsedData.qualifications.join('\n') : parsedData.qualifications,
                benefits: Array.isArray(parsedData.benefits) ? parsedData.benefits.join('\n') : parsedData.benefits,
                skills: Array.isArray(parsedData.skills) ? parsedData.skills.join(', ') : parsedData.skills,
            };
            reset(prefillData);
        }
    }, [parsedData, reset]);


    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            setFileName(file.name);
            setParseError('');
            handleParse(file);
        } else {
            setParseError('Please select a valid PDF file.');
            setFileName('');
        }
    };

    const handleParse = async (file) => {
        setIsParsing(true);
        setParseError('');
        const formData = new FormData();
        formData.append('job_pdf', file);

        try {
            const response = await axios.post('http://localhost:8000/jobs/parse-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setParsedData(response.data);
            setFileName(file.name); // Keep filename displayed
        } catch (error) {
            console.error('Error parsing PDF:', error);
            setParseError('Failed to parse PDF. Please check the file or try again.');
            setFileName('');
        } finally {
            setIsParsing(false);
        }
    };

    // --- 2. REPLACE onSubmit WITH THE MORE ROBUST VERSION FROM JobPostingForm ---
    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const processedData = {
                ...data,
                minExperience: data.minExperience ? Number(data.minExperience) : null,
                maxExperience: data.maxExperience ? Number(data.maxExperience) : null,
                minSalary: data.minSalary ? Number(data.minSalary) : null,
                maxSalary: data.maxSalary ? Number(data.maxSalary) : null,
                positionsAvailable: Number(data.positionsAvailable),
                skills: data.skills ? data.skills.split(',').map(skill => skill.trim()).filter(Boolean) : [],
                requirements: data.requirements ? data.requirements.split('\n').filter(Boolean) : [],
                responsibilities: data.responsibilities ? data.responsibilities.split('\n').filter(Boolean) : [],
                qualifications: data.qualifications ? data.qualifications.split('\n').filter(Boolean) : [],
                benefits: data.benefits ? data.benefits.split('\n').filter(Boolean) : [],
                postedDate: new Date().toISOString(),
                status: 'Active',
                contactEmail: data.contactEmail || null,
                reportingTo: data.reportingTo || null,
            };

            await axios.post('http://localhost:8000/jobs/', processedData);

            setSubmitSuccess(true);
            setTimeout(() => {
                navigate('/manage-jobs');
            }, 2000);

        } catch (error) {
            console.error('Error posting job:', error);
            if (error.response && error.response.data && error.response.data.detail) {
                const errorDetails = error.response.data.detail.map(e => `${e.loc[1]}: ${e.msg}`).join('\n');
                alert(`Error:\n${errorDetails}`);
            } else {
                alert('Failed to post job. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setParsedData(null);
        setFileName('');
        setParseError('');
        reset(); // Reset form to default values
    }

    return (
        <div className="min-h-screen w-full bg-[#dda5a5] flex flex-col font-['Segoe_UI']">
            <Navbar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <div className="w-full max-w-5xl">
                    <div className="bg-white p-8 border-2 border-[#264143] rounded-2xl shadow-lg">
                        <header className="mb-8 text-center">
                            <h2 className="text-3xl font-bold text-[#264143]">Smart Post - Import from PDF</h2>
                            <p className="text-gray-500 mt-2">
                                {parsedData ? `Review details from ${fileName}, complete the form, and post.` : "Upload a job description PDF to auto-fill the form."}
                            </p>
                        </header>

                        {!parsedData && (
                            <div>
                                <div 
                                    className="mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-blue-500 transition-colors"
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    <div className="space-y-1 text-center">
                                        <UploadIcon />
                                        <p className="text-sm text-gray-600">
                                            {isParsing ? "Analyzing PDF..." : "Click to upload a Job Description PDF"}
                                        </p>
                                    </div>
                                </div>
                                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} disabled={isParsing} />
                                {parseError && <p className="text-red-500 text-sm mt-2 text-center">{parseError}</p>}
                                {isParsing && <div className="flex justify-center mt-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}
                            </div>
                        )}
                        
                        {parsedData && (
                             <>
                                {submitSuccess && <div className="bg-green-100 text-green-700 p-4 rounded mb-6 text-center">Job posted successfully! Redirecting...</div>}
                                
                                {/* --- 3. ADD THE FULL FORM STRUCTURE --- */}
                                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                        {/* Job Title */}
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Job Title *</label>
                                            <input {...register('jobTitle', { required: 'Job title is required' })} className={`w-full border-2 ${errors.jobTitle ? "border-red-500" : "border-gray-300"} rounded-lg p-2`} />
                                            {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle.message}</p>}
                                        </div>

                                        {/* Department */}
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Department *</label>
                                            <select {...register('department', { required: 'Department is required' })} className={`w-full border-2 ${errors.department ? "border-red-500" : "border-gray-300"} rounded-lg p-2`}>
                                                <option value="">Select Department</option>
                                                <option value="Engineering">Engineering</option>
                                                <option value="Marketing">Marketing</option>
                                                <option value="Sales">Sales</option>
                                                <option value="HR">Human Resources</option>
                                                <option value="Finance">Finance</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
                                        </div>

                                        {/* Location */}
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Location *</label>
                                            <input {...register('location', { required: 'Location is required' })} className={`w-full border-2 ${errors.location ? "border-red-500" : "border-gray-300"} rounded-lg p-2`} />
                                            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
                                        </div>

                                        {/* Work Type */}
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Work Type *</label>
                                            <select {...register('workType')} className="w-full border-2 border-gray-300 rounded-lg p-2">
                                                <option value="Full-time">Full-time</option>
                                                <option value="Part-time">Part-time</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Internship">Internship</option>
                                            </select>
                                        </div>

                                        {/* Work Mode */}
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Work Mode *</label>
                                            <select {...register('workMode')} className="w-full border-2 border-gray-300 rounded-lg p-2">
                                                <option value="On-site">On-site</option>
                                                <option value="Remote">Remote</option>
                                                <option value="Hybrid">Hybrid</option>
                                            </select>
                                        </div>

                                        {/* Experience Level */}
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Experience Level *</label>
                                            <select {...register('experienceLevel')} className="w-full border-2 border-gray-300 rounded-lg p-2">
                                                <option value="Entry Level">Entry Level (0-2 years)</option>
                                                <option value="Mid Level">Mid Level (3-5 years)</option>
                                                <option value="Senior Level">Senior Level (6-10 years)</option>
                                            </select>
                                        </div>

                                        {/* Min/Max Experience */}
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Min Experience (yrs)</label>
                                            <input type="number" {...register('minExperience')} className="w-full border-2 border-gray-300 rounded-lg p-2" />
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Max Experience (yrs)</label>
                                            <input type="number" {...register('maxExperience')} className="w-full border-2 border-gray-300 rounded-lg p-2" />
                                        </div>
                                        
                                        {/* Application Deadline */}
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Application Deadline</label>
                                            <input type="date" {...register('applicationDeadline')} className="w-full border-2 border-gray-300 rounded-lg p-2" />
                                        </div>
                                        
                                        {/* Salary Fields */}
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Currency</label>
                                            <select {...register('currency')} className="w-full border-2 border-gray-300 rounded-lg p-2">
                                                <option value="INR">INR (₹)</option>
                                                <option value="USD">USD ($)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Min Salary (Annual)</label>
                                            <input type="number" {...register('minSalary')} className="w-full border-2 border-gray-300 rounded-lg p-2" />
                                        </div>
                                         <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Max Salary (Annual)</label>
                                            <input type="number" {...register('maxSalary')} className="w-full border-2 border-gray-300 rounded-lg p-2" />
                                        </div>

                                        {/* Other Optional Fields */}
                                        <div><label className="block font-semibold text-gray-700 mb-1">Band</label><input {...register('band')} className="w-full border-2 border-gray-300 rounded-lg p-2" /></div>
                                        <div><label className="block font-semibold text-gray-700 mb-1">Reporting To</label><input {...register('reportingTo')} className="w-full border-2 border-gray-300 rounded-lg p-2" /></div>
                                        <div><label className="block font-semibold text-gray-700 mb-1">Positions Available</label><input type="number" {...register('positionsAvailable')} className="w-full border-2 border-gray-300 rounded-lg p-2" /></div>
                                    </div>
                                    
                                    {/* Text Areas */}
                                    <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Job Description</label><textarea {...register('jobDescription')} rows="4" className="w-full border-2 border-gray-300 rounded-lg p-2"></textarea></div>
                                    <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Key Responsibilities (one per line)</label><textarea {...register('responsibilities')} rows="5" className="w-full border-2 border-gray-300 rounded-lg p-2"></textarea></div>
                                    <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Requirements (one per line)</label><textarea {...register('requirements')} rows="5" className="w-full border-2 border-gray-300 rounded-lg p-2"></textarea></div>
                                    <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Qualifications (one per line)</label><textarea {...register('qualifications')} rows="3" className="w-full border-2 border-gray-300 rounded-lg p-2"></textarea></div>
                                    <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Required Skills (comma-separated)</label><textarea {...register('skills')} rows="3" className="w-full border-2 border-gray-300 rounded-lg p-2"></textarea></div>
                                    <div className="md:col-span-2"><label className="block font-semibold text-gray-700 mb-1">Benefits (one per line)</label><textarea {...register('benefits')} rows="3" className="w-full border-2 border-gray-300 rounded-lg p-2"></textarea></div>
                                    
                                    {/* Checkboxes */}
                                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                                        <div className="flex items-center"><input {...register('isUrgent')} type="checkbox" className="h-4 w-4" /><label className="ml-2">Urgent Hiring</label></div>
                                        <div className="flex items-center"><input {...register('travelRequired')} type="checkbox" className="h-4 w-4" /><label className="ml-2">Travel Required</label></div>
                                        <div className="flex items-center"><input {...register('backgroundCheckRequired')} type="checkbox" className="h-4 w-4" /><label className="ml-2">Background Check Required</label></div>
                                    </div>
                                    
                                    <div className="flex justify-end space-x-4 pt-6 border-t mt-6">
                                        <button type="button" onClick={handleCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100">Cancel & Upload New</button>
                                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-[#DE5499] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">
                                            {isSubmitting ? 'Posting...' : 'Confirm & Post Job'}
                                        </button>
                                    </div>
                                </form>
                             </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ImportJob;
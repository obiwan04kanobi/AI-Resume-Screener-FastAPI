import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';

// --- API Configuration ---
const POST_JOB_API_URL = "http://127.0.0.1:8000/jobs/"; // Replace with your actual posting endpoint

const JobPostingForm = ({ initialData }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        getValues
    } = useForm({
        // Default values now include all fields from your JD
        defaultValues: {
            jobTitle: '',
            department: '',
            location: '',
            qualification: '',
            band: '',
            preferredIndustry: '',
            reportingTo: '',
            workType: 'Full-time',
            workMode: 'On-site',
            experienceLevel: 'Mid Level',
            minExperience: '',
            maxExperience: '',
            minSalary: '',
            maxSalary: '',
            currency: 'INR',
            applicationDeadline: '',
            positionsAvailable: 1,
            jobDescription: '',
            responsibilities: '',
            requirements: '',
            qualifications: '',
            skills: '',
            benefits: '',
            contactEmail: '',
            isUrgent: false,
            travelRequired: false,
            backgroundCheckRequired: false
        }
    });
    
    // This effect runs when the component mounts and populates the form if initialData exists.
    useEffect(() => {
        if (initialData) {
            reset(initialData);
        }
    }, [initialData, reset]);

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // Process data for the backend, including all new fields
            const processedData = {
                ...data,
                minExperience: data.minExperience ? Number(data.minExperience) : null,
                maxExperience: data.maxExperience ? Number(data.maxExperience) : null,
                minSalary: data.minSalary ? Number(data.minSalary) : null,
                maxSalary: data.maxSalary ? Number(data.maxSalary) : null,
                positionsAvailable: Number(data.positionsAvailable),
                skills: data.skills.toString().split(',').map(skill => skill.trim()).filter(Boolean),
                requirements: data.requirements.toString().split('\n').filter(req => req.trim()),
                responsibilities: data.responsibilities.toString().split('\n').filter(resp => resp.trim()),
                qualifications: data.qualifications.toString().split('\n').filter(qual => qual.trim()),
                benefits: data.benefits.toString().split('\n').filter(benefit => benefit.trim()),
                postedDate: new Date().toISOString(),
                status: 'Active',
                // Ensure optional fields are sent as null if empty
                contactEmail: data.contactEmail || null,
                reportingTo: data.reportingTo || null,
                band: data.band || null,
                preferredIndustry: data.preferredIndustry || null,
            };

            await axios.post(POST_JOB_API_URL, processedData);

            setSubmitSuccess(true);
            setTimeout(() => {
                navigate('/manage-jobs');
            }, 2000);

        } catch (error) {
            console.error('Error posting job:', error);
            if (error.response?.data?.detail) {
                const errorDetails = error.response.data.detail.map(e => `${e.loc[1]}: ${e.msg}`).join('\n');
                alert(`Error:\n${errorDetails}`);
            } else {
                alert('Failed to post job. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full">
            <div className="w-full fixed top-0 left-0 z-50">
                <Navbar />
            </div>
            
            <div className="w-full max-w-6xl mx-auto px-4 pb-12 pt-28">
                <div className="bg-white shadow-xl rounded-lg p-8">
                    
                    <div className="flex justify-between items-center mb-8 border-b pb-4">
                        <h1 className="text-3xl font-bold text-gray-800">Post a New Job</h1>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Start Over with PDF
                        </button>
                    </div>
                    
                    {submitSuccess && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 text-center">
                            Job posted successfully! Redirecting...
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
                        {/* --- Main Details Grid --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                            
                            {/* Job Title */}
                            <div className="lg:col-span-2">
                                <label className="block font-semibold text-gray-700 mb-1">Job Title *</label>
                                <input
                                    {...register('jobTitle', { required: 'Job title is required' })}
                                    className={`w-full border-2 ${errors.jobTitle ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                    placeholder="e.g., Warehouse Operations"
                                />
                                {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle.message}</p>}
                            </div>

                            {/* Department */}
                            <div className="lg:col-span-2">
                                <label className="block font-semibold text-gray-700 mb-1">Department *</label>
                                <input
                                    {...register('department', { required: 'Department is required' })}
                                    className={`w-full border-2 ${errors.department ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                    placeholder="e.g., Supply Chain Management"
                                />
                                {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
                            </div>

                            {/* Base Location */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Base Location *</label>
                                <input
                                    {...register('location', { required: 'Location is required' })}
                                    className={`w-full border-2 ${errors.location ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                    placeholder="e.g., Noida"
                                />
                                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
                            </div>

                            {/* Qualification */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Qualification *</label>
                                <input
                                    {...register('qualification', { required: 'Qualification is required' })}
                                    className={`w-full border-2 ${errors.qualification ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                    placeholder="e.g., Graduate/MBA/CS"
                                />
                                {errors.qualification && <p className="text-red-500 text-xs mt-1">{errors.qualification.message}</p>}
                            </div>

                             {/* Band */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Band</label>
                                <input
                                    {...register('band')}
                                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
                                    placeholder="e.g., E3A/E3B/M1A"
                                />
                            </div>

                            {/* Reporting To */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Reporting To</label>
                                <input
                                    {...register('reportingTo')}
                                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
                                    placeholder="e.g., NHQ Operations Head"
                                />
                            </div>

                             {/* Min Experience */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Min Experience (Yrs) *</label>
                                <input
                                    {...register('minExperience', { required: 'Min experience is required', min: { value: 0, message: 'Must be non-negative' } })}
                                    type="number"
                                    className={`w-full border-2 ${errors.minExperience ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                    placeholder="e.g., 5"
                                />
                                {errors.minExperience && <p className="text-red-500 text-xs mt-1">{errors.minExperience.message}</p>}
                            </div>

                            {/* Max Experience */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Max Experience (Yrs) *</label>
                                <input
                                    {...register('maxExperience', { required: 'Max experience is required', validate: v => Number(v) >= Number(getValues('minExperience')) || 'Max must be >= min' })}
                                    type="number"
                                    className={`w-full border-2 ${errors.maxExperience ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                    placeholder="e.g., 8"
                                />
                                {errors.maxExperience && <p className="text-red-500 text-xs mt-1">{errors.maxExperience.message}</p>}
                            </div>
                            
                            {/* Preferred Industry */}
                            <div className="lg:col-span-2">
                                <label className="block font-semibold text-gray-700 mb-1">Preferred Industry</label>
                                <input
                                    {...register('preferredIndustry')}
                                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
                                    placeholder="e.g., Handset / Telecom / FMCG"
                                />
                            </div>

                        </div>
                        
                        {/* --- Job Description & Responsibilities --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-6">
                             {/* About the Role / Job Description */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">About the Role (Job Description) *</label>
                                <textarea
                                    {...register('jobDescription', { required: 'Job description is required' })}
                                    rows="10"
                                    className={`w-full border-2 ${errors.jobDescription ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                    placeholder="Provide a comprehensive overview of the role..."
                                />
                                {errors.jobDescription && <p className="text-red-500 text-xs mt-1">{errors.jobDescription.message}</p>}
                            </div>

                            {/* Key Deliverables / Responsibilities */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Key Deliverables & Responsibilities *</label>
                                <textarea
                                    {...register('responsibilities', { required: 'Responsibilities are required' })}
                                    rows="10"
                                    className={`w-full border-2 ${errors.responsibilities ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                    placeholder="List key responsibilities (one per line)..."
                                />
                                {errors.responsibilities && <p className="text-red-500 text-xs mt-1">{errors.responsibilities.message}</p>}
                            </div>
                        </div>

                        {/* --- Requirements & Skills --- */}
                         <div>
                            <label className="block font-semibold text-gray-700 mb-1">Ideal Candidate Profile (Requirements) *</label>
                            <textarea
                                {...register('requirements', { required: 'Requirements are required' })}
                                rows="6"
                                className={`w-full border-2 ${errors.requirements ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                placeholder="List ideal candidate requirements (one per line)..."
                            />
                            {errors.requirements && <p className="text-red-500 text-xs mt-1">{errors.requirements.message}</p>}
                        </div>

                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Skill Set *</label>
                            <textarea
                                {...register('skills', { required: 'Skills are required' })}
                                rows="4"
                                className={`w-full border-2 ${errors.skills ? "border-red-500" : "border-gray-300"} rounded-lg px-3 py-2`}
                                placeholder="Enter skills separated by commas (e.g., Warehouse Management, Inventory Control, Logistics)"
                            />
                            {errors.skills && <p className="text-red-500 text-xs mt-1">{errors.skills.message}</p>}
                        </div>


                        {/* Form Actions */}
                        <div className="flex justify-end space-x-4 pt-6 border-t mt-8">
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Posting...' : 'Confirm and Post Job'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default JobPostingForm;

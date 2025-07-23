import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';

// Live API Endpoints
const GET_JOBS_API = 'https://4vj8gtysxi.execute-api.ap-south-1.amazonaws.com/JobListings';
const GET_RESUMES_API = 'https://k2kqvumlg6.execute-api.ap-south-1.amazonaws.com/getResume';
const UPDATE_JOB_API = 'https://jd8992ps66.execute-api.ap-south-1.amazonaws.com/updatejobstatus';

// --- Job Edit Modal Component ---
const JobEditModal = ({ job, onClose, onSave, onDelete }) => {
    const { register, handleSubmit, formState: { errors }, getValues } = useForm({
        defaultValues: {
            ...job,
            responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : '',
            requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : '',
            qualifications: Array.isArray(job.qualifications) ? job.qualifications.join('\n') : '',
            skills: Array.isArray(job.skills) ? job.skills.join(', ') : '',
            benefits: Array.isArray(job.benefits) ? job.benefits.join('\n') : '',
        }
    });
    const [isDeleting, setIsDeleting] = useState(false);

    const onSubmit = (data) => {
        const processedData = {
            ...data,
            minExperience: data.minExperience ? Number(data.minExperience) : null,
            maxExperience: data.maxExperience ? Number(data.maxExperience) : null,
            minSalary: data.minSalary ? Number(data.minSalary) : null,
            maxSalary: data.maxSalary ? Number(data.maxSalary) : null,
            positionsAvailable: Number(data.positionsAvailable),
            skills: data.skills.split(',').map(skill => skill.trim()).filter(Boolean),
            requirements: data.requirements.split('\n').filter(Boolean),
            responsibilities: data.responsibilities.split('\n').filter(Boolean),
            qualifications: data.qualifications.split('\n').filter(Boolean),
            benefits: data.benefits.split('\n').filter(Boolean),
        };
        onSave(processedData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Modify Job: {job.jobTitle}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X size={24} /></button>
                </header>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Job Title *</label>
                            <input {...register('jobTitle', { required: 'Job title is required' })} className={`w-full border-2 ${errors.jobTitle ? "border-red-500" : "border-gray-300"} rounded-lg p-2`} />
                            {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle.message}</p>}
                        </div>
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Department (Cannot be changed)</label>
                            <select {...register('department')} disabled className={`w-full border-2 border-gray-300 rounded-lg p-2 bg-gray-100 cursor-not-allowed`}>
                                <option value="Engineering">Engineering</option><option value="Marketing">Marketing</option><option value="Sales">Sales</option><option value="HR">Human Resources</option><option value="Finance">Finance</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Location *</label>
                            <input {...register('location', { required: 'Location is required' })} className={`w-full border-2 ${errors.location ? "border-red-500" : "border-gray-300"} rounded-lg p-2`} />
                        </div>
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Experience Level *</label>
                            <select {...register('experienceLevel', { required: 'Experience level is required' })} className={`w-full border-2 ${errors.experienceLevel ? "border-red-500" : "border-gray-300"} rounded-lg p-2`}>
                                <option value="Entry Level">Entry Level (0-2 years)</option><option value="Mid Level">Mid Level (3-5 years)</option><option value="Senior Level">Senior Level (6-10 years)</option><option value="Executive Level">Executive Level (10+ years)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Min Experience (years) *</label>
                            <input type="number" {...register('minExperience', { required: true, min: 0 })} className={`w-full border-2 ${errors.minExperience ? "border-red-500" : "border-gray-300"} rounded-lg p-2`} />
                        </div>
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Max Experience (years) *</label>
                            <input type="number" {...register('maxExperience', { required: true, validate: value => Number(value) >= Number(getValues('minExperience')) || 'Must be >= min' })} className={`w-full border-2 ${errors.maxExperience ? "border-red-500" : "border-gray-300"} rounded-lg p-2`} />
                        </div>
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Min Salary (Annual) *</label>
                            <input type="number" {...register('minSalary', { required: true })} className={`w-full border-2 ${errors.minSalary ? "border-red-500" : "border-gray-300"} rounded-lg p-2`} />
                        </div>
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Max Salary (Annual) *</label>
                            <input type="number" {...register('maxSalary', { required: true, validate: value => Number(value) >= Number(getValues('minSalary')) || 'Must be >= min' })} className={`w-full border-2 ${errors.maxSalary ? "border-red-500" : "border-gray-300"} rounded-lg p-2`} />
                        </div>
                    </div>
                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Job Description *</label>
                        <textarea {...register('jobDescription', { required: 'Description is required' })} rows="4" className={`w-full border-2 ${errors.jobDescription ? "border-red-500" : "border-gray-300"} rounded-lg p-2`}></textarea>
                    </div>
                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Key Responsibilities (one per line)*</label>
                        <textarea {...register('responsibilities', { required: 'Responsibilities are required' })} rows="4" className={`w-full border-2 ${errors.responsibilities ? "border-red-500" : "border-gray-300"} rounded-lg p-2`}></textarea>
                    </div>
                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Requirements (one per line)*</label>
                        <textarea {...register('requirements', { required: 'Requirements are required' })} rows="4" className={`w-full border-2 ${errors.requirements ? "border-red-500" : "border-gray-300"} rounded-lg p-2`}></textarea>
                    </div>
                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Skills (comma-separated)*</label>
                        <textarea {...register('skills', { required: 'Skills are required' })} rows="2" className={`w-full border-2 ${errors.skills ? "border-red-500" : "border-gray-300"} rounded-lg p-2`}></textarea>
                    </div>
                    {/* --- ADDED THIS SECTION --- */}
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center">
                            <input {...register('isUrgent')} type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label className="ml-2 block text-sm text-gray-700">Mark as urgent hiring</label>
                        </div>
                        <div className="flex items-center">
                            <input {...register('travelRequired')} type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label className="ml-2 block text-sm text-gray-700">Travel required for this position</label>
                        </div>
                        <div className="flex items-center">
                            <input {...register('backgroundCheckRequired')} type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label className="ml-2 block text-sm text-gray-700">Background check required</label>
                        </div>
                    </div>
                </form>

                <footer className="flex justify-between items-center p-4 border-t bg-gray-50">
                    <div>
                        {isDeleting ? (
                            <button onClick={() => onDelete(job.job_id)} className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 font-semibold">Confirm Delete?</button>
                        ) : (
                            <button onClick={() => setIsDeleting(true)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold">Delete Job</button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100">Cancel</button>
                        <button onClick={handleSubmit(onSubmit)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Save Changes</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};


const ManageJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingJobId, setUpdatingJobId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);

    const fetchJobsAndSubmissions = async () => {
        setLoading(true);
        setError(null);
        try {
            const [jobsResponse, resumesResponse] = await Promise.all([
                axios.get(GET_JOBS_API),
                axios.get(GET_RESUMES_API)
            ]);
            const resumes = resumesResponse.data;
            const submissionCounts = resumes.reduce((acc, resume) => {
                if (resume.jobId) acc[resume.jobId] = (acc[resume.jobId] || 0) + 1;
                return acc;
            }, {});
            const rawJobData = jobsResponse.data.data;
            const flattenedJobs = Object.values(rawJobData).flat();
            const jobsWithCounts = flattenedJobs.map(job => ({ ...job, submissionCount: submissionCounts[job.job_id] || 0 }));
            const sortedJobs = jobsWithCounts.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
            setJobs(sortedJobs);
            setFilteredJobs(sortedJobs);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to fetch job data. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchJobsAndSubmissions(); }, []);

    useEffect(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const filtered = jobs.filter(job =>
            (job.jobTitle && job.jobTitle.toLowerCase().includes(lowercasedSearchTerm)) ||
            (job.department && job.department.toLowerCase().includes(lowercasedSearchTerm)) ||
            (job.job_id && job.job_id.toLowerCase().includes(lowercasedSearchTerm))
        );
        setFilteredJobs(filtered);
    }, [searchTerm, jobs]);

    const toggleJobStatus = async (jobId, currentStatus) => {
        if (updatingJobId) return;
        setUpdatingJobId(jobId);
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        const originalJobs = [...jobs];
        setJobs(jobs.map(job => job.job_id === jobId ? { ...job, status: newStatus } : job));
        try {
            await axios.post(UPDATE_JOB_API, { job_id: jobId, status: newStatus, action: 'update_status' });
        } catch (err) {
            console.error("Failed to update job status:", err);
            alert("Failed to update job status. Reverting change.");
            setJobs(originalJobs);
        } finally {
            setUpdatingJobId(null);
        }
    };

    const handleOpenModal = (job) => setSelectedJob(job);
    const handleCloseModal = () => setSelectedJob(null);

    const handleSaveJob = async (updatedJobData) => {
        if (updatingJobId) return;
        const originalJobId = updatedJobData.job_id;
        setUpdatingJobId(originalJobId);

        try {
            const response = await axios.post(UPDATE_JOB_API, {
                ...updatedJobData,
                action: 'update_job_details'
            });
            
            const finalJobData = response.data.updatedJob;

            setJobs(prevJobs => 
                prevJobs.map(j => j.job_id === originalJobId ? { ...j, ...finalJobData } : j)
            );

            alert('Job updated successfully!');
        } catch (err) {
            console.error("Failed to save job:", err);
            alert("Failed to save job. Please check the console for details.");
        } finally {
            setUpdatingJobId(null);
            handleCloseModal();
        }
    };

    const handleDeleteJob = async (jobId) => {
        if (updatingJobId) return;
        setUpdatingJobId(jobId);
        const originalJobs = [...jobs];
        setJobs(jobs.filter(job => job.job_id !== jobId));
        try {
            await axios.post(UPDATE_JOB_API, { job_id: jobId, action: 'delete' });
            alert('Job deleted successfully!');
        } catch (err) {
            console.error("Failed to delete job:", err);
            alert("Failed to delete job. Reverting change.");
            setJobs(originalJobs);
        } finally {
            setUpdatingJobId(null);
            handleCloseModal();
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#dda5a5] flex flex-col font-['Segoe_UI']">
            <Navbar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white p-6 sm:p-8 border-2 border-[#264143] rounded-2xl shadow-lg">
                        <header className="mb-8"><h2 className="text-3xl font-bold text-[#264143]">Manage Job Listings</h2></header>
                        <div className="mb-6"><input type="text" placeholder="Search by Job ID, Title, or Department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"/></div>
                        {loading && <p className="text-center text-lg">Loading...</p>}
                        {error && <p className="text-center text-lg text-red-500">{error}</p>}
                        {!loading && !error && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">Job ID</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">Job Title</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">Department</th>
                                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase">Submissions</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">Status</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredJobs.map((job) => (
                                            <tr key={job.job_id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-800">{job.job_id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-900">{job.jobTitle}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600">{job.department}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800 font-semibold text-center">{job.submissionCount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${job.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{job.status}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => toggleJobStatus(job.job_id, job.status)} disabled={updatingJobId === job.job_id} className={`px-4 py-2 rounded-lg text-white w-32 text-center font-semibold ${job.status === 'Active' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}>
                                                            {updatingJobId === job.job_id && !selectedJob ? '...' : (job.status === 'Active' ? 'Deactivate' : 'Reactivate')}
                                                        </button>
                                                        <button onClick={() => handleOpenModal(job)} className="px-4 py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 w-32 text-center font-semibold">
                                                            Modify
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredJobs.length === 0 && <p className="text-center text-lg text-gray-500 mt-8 py-4">No jobs found.</p>}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            {selectedJob && <JobEditModal job={selectedJob} onClose={handleCloseModal} onSave={handleSaveJob} onDelete={handleDeleteJob} />}
        </div>
    );
};

export default ManageJobs;

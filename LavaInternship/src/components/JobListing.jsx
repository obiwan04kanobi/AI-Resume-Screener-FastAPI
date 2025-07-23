import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Users, Calendar, Building, Briefcase, Star, X, User, FileText, Target, Award, CheckCircle, ShieldCheck, Plane } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const JobListing = () => {
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        department: '',
        workType: '',
        workMode: '',
        experienceLevel: '',
        search: ''
    });

    const handleApplyNow = (jobId, jobTitle) => {
        // Store job info in localStorage for the form to access
        localStorage.setItem('applicationJobId', jobId);
        localStorage.setItem('applicationJobTitle', jobTitle);

        // Navigate to resume form
        navigate('/studentform');
    };


    // Fetch jobs from API
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await fetch("https://4vj8gtysxi.execute-api.ap-south-1.amazonaws.com/JobListings");
                const data = await res.json();

                if (data.status === "success" && data.data) {
                    const groupedJobs = data.data;

                    // Flatten grouped jobs and map to a consistent structure
                    const allJobs = Object.values(groupedJobs).flat().map((job, index) => ({
                        ...job,
                        id: job.job_id, // provide fallback ID
                        jobTitle: job.jobTitle ?? "Untitled Job",
                        workType: job.workType ?? "N/A",
                        workMode: job.workMode ?? "N/A",
                        experienceLevel: job.experienceLevel ?? "N/A",
                        minExperience: job.minExperience ?? "0",
                        maxExperience: job.maxExperience ?? "0",
                        minSalary: job.minSalary ?? "0",
                        maxSalary: job.maxSalary ?? "0",
                        currency: job.currency ?? "INR",
                        postedDate: job.postedDate ?? new Date().toISOString(),
                        status: job.status ?? "Active"
                    }));

                    // **UPDATE**: Filter to only include jobs with an "Active" status.
                    const activeJobs = allJobs.filter(job => job.status === 'Active');

                    setJobs(activeJobs);
                    setFilteredJobs(activeJobs);
                } else {
                    console.error("Invalid response format", data);
                }
            } catch (error) {
                console.error("Error fetching jobs:", error);
            }
        };

        fetchJobs();
    }, []);

    useEffect(() => {
        filterJobs();
    }, [filters, jobs]);

    const filterJobs = () => {
        let filtered = jobs.filter(job => {
            const matchesSearch = job.jobTitle.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.department?.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.location?.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.id?.toLowerCase().includes(filters.search.toLowerCase()); // <-- ADD THIS LINE
            const matchesDepartment = !filters.department || job.department === filters.department;
            const matchesWorkType = !filters.workType || job.workType === filters.workType;
            const matchesWorkMode = !filters.workMode || job.workMode === filters.workMode;
            const matchesExperienceLevel = !filters.experienceLevel || job.experienceLevel === filters.experienceLevel;

            return matchesSearch && matchesDepartment && matchesWorkType && matchesWorkMode && matchesExperienceLevel;
        });

        setFilteredJobs(filtered);
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const formatSalary = (min, max, currency) => {
        const formatNumber = (num) => {
            const number = parseInt(num);
            if (number >= 10000000) return `${(number / 10000000).toFixed(1)}Cr`;
            if (number >= 100000) return `${(number / 100000).toFixed(1)}L`;
            if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
            return number.toString();
        };

        const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
        return `${symbol}${formatNumber(min)} - ${symbol}${formatNumber(max)}`;
    };

    const getTimeAgo = (dateString) => {
        const now = new Date();
        const posted = new Date(dateString);
        const diffInHours = Math.floor((now - posted) / (1000 * 60 * 60));

        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        const diffInWeeks = Math.floor(diffInDays / 7);
        return `${diffInWeeks}w ago`;
    };

    const resetFilters = () => {
        setFilters({
            department: '',
            workType: '',
            workMode: '',
            experienceLevel: '',
            search: ''
        });
    };

    const openModal = (job) => {
        setSelectedJob(job);
        setIsModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedJob(null);
        document.body.style.overflow = 'unset';
    };

    // Modal component
    const JobModal = ({ job, isOpen, onClose }) => {
        if (!isOpen || !job) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{job.jobTitle}</h2>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Building className="w-4 h-4" />
                                    {job.department}
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {job.location}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {getTimeAgo(job.postedDate)}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>

                    {/* Modal Content - Scrollable */}
                    <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                        <div className="p-6 space-y-6">
                            {/* Job Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-green-600 font-semibold text-xl">
                                        {formatSalary(job.minSalary, job.maxSalary, job.currency)}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Users className="w-5 h-5" />
                                        <span>{job.positionsAvailable} position{job.positionsAvailable > 1 ? 's' : ''} available</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Briefcase className="w-5 h-5" />
                                        <span>{job.workType} • {job.workMode}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <User className="w-5 h-5" />
                                        <span>Experience: {job.minExperience}-{job.maxExperience} years</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Award className="w-5 h-5" />
                                        <span>Level: {job.experienceLevel}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Calendar className="w-5 h-5" />
                                        <span>Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Job Description */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Job Description
                                </h3>
                                <p className="text-gray-700 leading-relaxed">{job.jobDescription}</p>
                            </div>

                            {/* Skills Required */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Target className="w-5 h-5" />
                                    Skills Required
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {Array.isArray(job.skills) && job.skills.length > 0 ? (
                                        job.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                                            >
                                                {skill}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-gray-400 italic">Skills not specified</span>
                                    )}
                                </div>
                            </div>

                            {/* Job Responsibilities */}
                            {job.responsibilities && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Key Responsibilities
                                    </h3>
                                    <div className="space-y-2">
                                        {Array.isArray(job.responsibilities) ? (
                                            job.responsibilities.map((responsibility, index) => (
                                                <div key={index} className="flex items-start gap-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                                    <span className="text-gray-700">{responsibility}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-gray-400 italic">Responsibilities not specified</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Additional Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <span className="font-medium text-gray-700">Job ID: </span>
                                    <span className="text-gray-600">{job.id}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Status: </span>
                                    <span className="text-green-600 font-medium">{job.status}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Posted: </span>
                                    <span className="text-gray-600">{new Date(job.postedDate).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Currency: </span>
                                    <span className="text-gray-600">{job.currency}</span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        Additional Details
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {job.isUrgent && (
                                            <span className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                                                <Star size={16} /> Urgent Hiring
                                            </span>
                                        )}
                                        {job.travelRequired && (
                                            <span className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                                <Plane size={16} /> Travel Required
                                            </span>
                                        )}
                                        {job.backgroundCheckRequired && (
                                            <span className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                                                <ShieldCheck size={16} /> Background Check Required
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-6 border-t border-gray-200 bg-gray-50">
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleApplyNow(job.id, job.jobTitle)}
                                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                Apply Now
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8 mt-12 sm:mt-16 md:mt-20">
                    <h1 className="text-3xl font-bold text-white mb-2">Job Openings</h1>
                    <p className="text-white">Discover exciting career opportunities</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8 sticky top-0 z-10 backdrop-blur-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* Search */}
                        <div className="lg:col-span-2">
                            <input
                                type="text"
                                placeholder="Search by ID, title, department..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Department Filter */}
                        <div>
                            <select
                                value={filters.department}
                                onChange={(e) => handleFilterChange('department', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Departments</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Design">Design</option>
                                <option value="Sales">Sales</option>
                                <option value="HR">HR</option>
                                <option value="Finance">Finance</option>
                            </select>
                        </div>

                        {/* Work Type Filter */}
                        <div>
                            <select
                                value={filters.workType}
                                onChange={(e) => handleFilterChange('workType', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Types</option>
                                <option value="Full-time">Full-time</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Contract">Contract</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </div>

                        {/* Work Mode Filter */}
                        <div>
                            <select
                                value={filters.workMode}
                                onChange={(e) => handleFilterChange('workMode', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Modes</option>
                                <option value="On-site">On-site</option>
                                <option value="Remote">Remote</option>
                                <option value="Hybrid">Hybrid</option>
                            </select>
                        </div>

                        {/* Reset Button */}
                        <div>
                            <button
                                onClick={resetFilters}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-6">
                    <p className="font-bold text-white">
                        Showing {filteredJobs.length} of {jobs.length} jobs
                    </p>
                </div>

                {/* Scrollable Job Listings */}
                <div className="overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
                    {/* Job Cards */}
                    <div className="space-y-6">
                        {filteredJobs.map(job => (
                            <div key={job.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                                <div className="p-6">
                                    {/* Job Header */}
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-xl font-bold text-gray-900">{job.jobTitle}</h3>
                                                {job.isUrgent && (
                                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <Star size={12} /> Urgent
                                                    </span>
                                                )}
                                                {job.travelRequired && (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <Plane size={12} /> Travel Required
                                                    </span>
                                                )}
                                                {job.backgroundCheckRequired && (
                                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <ShieldCheck size={12} /> Background Check
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                                <div className="flex items-center gap-1">
                                                    <Building className="w-4 h-4" />
                                                    {job.department}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {job.location}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Briefcase className="w-4 h-4" />
                                                    {job.workType} • {job.workMode}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {getTimeAgo(job.postedDate)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-1 text-green-600 font-semibold">
                                                {formatSalary(job.minSalary, job.maxSalary, job.currency)}
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <Users className="w-4 h-4" />
                                                {job.positionsAvailable} position{job.positionsAvailable > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Job Description */}
                                    <p className="text-gray-700 mb-4 line-clamp-2">{job.jobDescription}</p>

                                    {/* Skills */}
                                    <div className="mb-4">
                                        <div className="flex flex-wrap gap-2">
                                            {Array.isArray(job.skills) && job.skills.length > 0 ? (
                                                <>
                                                    {job.skills.slice(0, 3).map((skill, index) => (
                                                        <span
                                                            key={index}
                                                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {job.skills.length > 3 && (
                                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                                                            +{job.skills.length - 3} more
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic">Skills not specified</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Job Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                                        <div>
                                            <span className="font-medium text-gray-700">Experience: </span>
                                            <span className="text-gray-600">{job.minExperience}-{job.maxExperience} years</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Deadline: </span>
                                            <span className="text-gray-600 flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(job.applicationDeadline).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleApplyNow(job.id, job.jobTitle)}
                                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
                                            Apply Now
                                        </button>
                                        <button
                                            onClick={() => openModal(job)}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* No Results */}
                {filteredJobs.length === 0 && (
                    <div className="text-center py-12">
                        <div className="bg-white rounded-lg shadow-md p-8">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                            <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
                            <button
                                onClick={resetFilters}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Job Details Modal */}
            <JobModal job={selectedJob} isOpen={isModalOpen} onClose={closeModal} />
        </div>
    );
};

export default JobListing;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './Navbar';

// Helper function to parse date strings like '17/07/2025, 21:49:58'
const parseCandidateDate = (dateStr) => {
    if (!dateStr) return new Date(0); // Return a very old date for sorting purposes if null
    const [datePart, timePart] = dateStr.split(',');
    if (!datePart) return new Date(0);
    const [day, month, year] = datePart.split('/');
    // Note: JavaScript's Date constructor is month-indexed (0-11)
    return new Date(year, month - 1, day);
};

// Helper function to format gender
const formatGender = (genderCode) => {
    if (genderCode === 'M') return 'Male';
    if (genderCode === 'F') return 'Female';
    if (genderCode === 'O') return 'Other';
    return 'N/A';
};

const CandidateDatabase = () => {
    const [allCandidates, setAllCandidates] = useState([]);
    const [filteredCandidates, setFilteredCandidates] = useState([]);
    const [filters, setFilters] = useState({
        gender: '',
        jobType: '',
        experience: '',
        search: ''
    });
    const [filterOptions, setFilterOptions] = useState({
        jobTypes: [],
        experiences: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCandidates = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('https://k2kqvumlg6.execute-api.ap-south-1.amazonaws.com/getResume');
                
                // Sort the data by the 'datetime' field in descending order (newest first)
                const sortedData = data.sort((a, b) => {
                    const dateA = parseCandidateDate(a.datetime);
                    const dateB = parseCandidateDate(b.datetime);
                    return dateB - dateA; // Sort descending
                });

                setAllCandidates(sortedData);
                setFilteredCandidates(sortedData);

                const jobTypes = [...new Set(data.map(c => c.department).filter(Boolean))];
                const experiences = [...new Set(data.map(c => c.experience).filter(Boolean))];
                setFilterOptions({ jobTypes, experiences });
            } catch (err) {
                console.error("Error fetching candidates:", err);
                setError("Failed to fetch candidate data.");
            } finally {
                setLoading(false);
            }
        };

        fetchCandidates();
    }, []);

    useEffect(() => {
        let processedCandidates = allCandidates.filter(c => {
            const searchLower = filters.search.toLowerCase();
            const matchesSearch = !filters.search ||
                (c.first_name && c.first_name.toLowerCase().includes(searchLower)) ||
                (c.last_name && c.last_name.toLowerCase().includes(searchLower)) ||
                (c.email && c.email.toLowerCase().includes(searchLower));

            const matchesGender = !filters.gender || c.gender === filters.gender;
            const matchesJobType = !filters.jobType || c.department === filters.jobType;
            const matchesExperience = !filters.experience || c.experience === filters.experience;

            return matchesSearch && matchesGender && matchesJobType && matchesExperience;
        });

        setFilteredCandidates(processedCandidates);
    }, [filters, allCandidates]);

    const handleFilterChange = (filterName, value) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            [filterName]: value
        }));
    };

    const resetFilters = () => {
        setFilters({
            gender: '',
            jobType: '',
            experience: '',
            search: ''
        });
    };

    return (
        <div className="h-screen w-full flex flex-col bg-[#dda5a5] font-['Segoe_UI']">
            <Navbar />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white p-6 sm:p-8 border-2 border-[#264143] rounded-2xl shadow-lg">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-[#264143]">Candidate Database</h1>
                            <p className="text-gray-600 mt-2 text-lg">Search, filter, and view all candidate submissions.</p>
                        </header>

                        {/* Filters */}
                        <div className="bg-gray-50 rounded-lg shadow-md p-6 mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
                                <div className="lg:col-span-2">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Candidates</label>
                                    <input
                                        id="search"
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select
                                        id="gender"
                                        value={filters.gender}
                                        onChange={(e) => handleFilterChange('gender', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">All Genders</option>
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="jobType" className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                                    <select
                                        id="jobType"
                                        value={filters.jobType}
                                        onChange={(e) => handleFilterChange('jobType', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">All Types</option>
                                        {filterOptions.jobTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                                    <select
                                        id="experience"
                                        value={filters.experience}
                                        onChange={(e) => handleFilterChange('experience', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">All Ranges</option>
                                        {filterOptions.experiences.sort().map(exp => (
                                            <option key={exp} value={exp}>{exp}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="lg:col-start-5">
                                    <button
                                        onClick={resetFilters}
                                        className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4 text-lg font-semibold text-gray-800">
                            Showing {filteredCandidates.length} of {allCandidates.length} candidates
                        </div>

                        {loading && <p className="text-center text-lg text-gray-600 py-8">Loading candidates...</p>}
                        {error && <p className="text-center text-lg text-red-500 py-8">{error}</p>}
                        {!loading && !error && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Job Type</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Experience</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Gender</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Age</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Submitted At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredCandidates.map(candidate => (
                                            <tr key={candidate.resume_id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{candidate.first_name} {candidate.last_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{candidate.email || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{candidate.phone || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{candidate.department || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{candidate.experience || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatGender(candidate.gender)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{candidate.age || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{candidate.status || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                    {candidate.datetime && parseCandidateDate(candidate.datetime) ? parseCandidateDate(candidate.datetime).toLocaleDateString() : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredCandidates.length === 0 && (
                                    <p className="text-center text-lg text-gray-500 mt-8 py-4">No candidates match the current filters.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CandidateDatabase;
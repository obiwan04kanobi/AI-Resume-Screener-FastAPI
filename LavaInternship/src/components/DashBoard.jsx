import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SendForReview from './SendForReview';
import { signOut } from 'aws-amplify/auth';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import Navbar from './Navbar';

const COLORS = ['#264143', '#DE5499', '#E99F4C', '#4ECDC4', '#45B7D1', '#96CEB4'];

const HRDashboard = () => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [submissionData, setSubmissionData] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [departmentData, setDepartmentData] = useState([]);
  const [reviewTimestamps, setReviewTimestamps] = useState({});
  const navigate = useNavigate();

  // Filter states
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    gender: '',
    workPref: '',
    dateFrom: '',
    dateTo: ''
  });

  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    statuses: [],
    genders: [],
    workPrefs: []
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedCandidate]);

  const handleCandidateSelect = (candidate) => {
    setSelectedCandidate(candidate);
    setReviewTimestamps((prev) => ({
      ...prev,
      [candidate.resume_id]: new Date().toISOString(),
    }));
    navigate('/dashboard');
  };

  const parseCandidateDate = (dateStr) => {
    if (!dateStr) return null;
    const [datePart] = dateStr.split(',');
    if (!datePart) return null;
    const [day, month, year] = datePart.split('/');
    // Month is 0-indexed in JavaScript's Date constructor
    return new Date(year, month - 1, day);
  };

  // --- UPDATED LOGIC FOR PIE CHARTS ---
  // This function now filters data for the last 30 days before calculating stats for pie charts.
  const processStats = (data) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentData = data.filter(candidate => {
      const candidateDate = parseCandidateDate(candidate.datetime);
      return candidateDate && candidateDate >= thirtyDaysAgo;
    });

    const departmentCount = recentData.reduce((acc, curr) => {
      const dept = curr.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    setDepartmentData(Object.entries(departmentCount).map(([name, value]) => ({ name, value })));

    const genderCount = recentData.reduce((acc, curr) => {
      const gender = curr.gender || 'Unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});
    setGenderData(Object.entries(genderCount).map(([name, value]) => ({ name, value })));

    const statusCount = recentData.reduce((acc, curr) => {
      const status = curr.status || 'Not Available';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    setStatusData(Object.entries(statusCount).map(([name, value]) => ({ name, value })));
  };

  const extractFilterOptions = (data) => {
    const activeData = data.filter(c => c.status !== "Rejected");
    const departments = [...new Set(activeData.map(c => c.department).filter(Boolean))];
    const statuses = [...new Set(activeData.map(c => c.status).filter(Boolean))];
    const genders = [...new Set(activeData.map(c => c.gender).filter(Boolean))];
    const workPrefs = [...new Set(activeData.map(c => c.work_pref).filter(Boolean))];

    setFilterOptions({
      departments,
      statuses,
      genders,
      workPrefs
    });
  };

  // This function remains unchanged for the bar chart logic.
  const processSubmissionStats = (data) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const submissions = { lastWeek: 0, lastTwoWeeks: 0, lastMonth: 0, lastThreeMonths: 0 };

    data.forEach(candidate => {
      const candidateDate = parseCandidateDate(candidate.datetime);
      if (!candidateDate) return;

      if (candidateDate >= oneWeekAgo) submissions.lastWeek++;
      else if (candidateDate >= twoWeeksAgo) submissions.lastTwoWeeks++;
      else if (candidateDate >= oneMonthAgo) submissions.lastMonth++;
      else if (candidateDate >= threeMonthsAgo) submissions.lastThreeMonths++;
    });

    const chartData = [
      { period: 'Last Week', submissions: submissions.lastWeek },
      { period: 'Week 2', submissions: submissions.lastTwoWeeks },
      { period: 'Weeks 3-4', submissions: submissions.lastMonth },
      { period: 'Month 2-3', submissions: submissions.lastThreeMonths }
    ];

    setSubmissionData(chartData);
  };

  const applyFilters = () => {
    let filtered = candidates.filter(c => c.status !== "Rejected");

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filtered = filtered.filter(c => parseCandidateDate(c.datetime) >= dateFrom);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(c => parseCandidateDate(c.datetime) <= toDate);
    }
    if (filters.department) {
      filtered = filtered.filter(c => c.department === filters.department);
    }
    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }
    if (filters.gender) {
      filtered = filtered.filter(c => c.gender === filters.gender);
    }
    if (filters.workPref) {
      filtered = filtered.filter(c => c.work_pref === filters.workPref);
    }

    setFilteredCandidates(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prevFilters => ({ ...prevFilters, [filterType]: value }));
  };

  const clearFilters = () => {
    setFilters({ department: '', status: '', gender: '', workPref: '', dateFrom: '', dateTo: '', experience: '' });
  };

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const { data } = await axios.get('https://k2kqvumlg6.execute-api.ap-south-1.amazonaws.com/getResume');
        setCandidates(data);
        processStats(data); // This will now process stats for the last 30 days for pie charts
        processSubmissionStats(data); // This remains unchanged for the bar chart
        extractFilterOptions(data);
        const initialFiltered = data.filter(c => c.status !== "Rejected");
        setFilteredCandidates(initialFiltered);
      } catch (err) {
        console.error("❌ Error fetching candidates:", err);
      }
    };

    fetchCandidates();
  }, []);

  useEffect(() => {
    if (candidates.length > 0) {
      applyFilters();
    }
  }, [filters, candidates]);

  const updateStatus = async (status) => {
    try {
      setCurrentStatus(status);
      await axios.post("https://c27ubyy9fi.execute-api.ap-south-1.amazonaws.com/UpdateStatus", {
        resume_id: selectedCandidate.resume_id,
        email: selectedCandidate.email,
        first_name: selectedCandidate.first_name,
        status,
      });

      alert(`Candidate ${selectedCandidate.first_name} marked as ${status}.`);

      const updatedCandidates = candidates.map(c =>
        c.resume_id === selectedCandidate.resume_id ? { ...c, status } : c
      );
      setCandidates(updatedCandidates);
      processStats(updatedCandidates); // Re-process stats with updated data
      extractFilterOptions(updatedCandidates);

      if (status === "Rejected") {
        setSelectedCandidate(null);
      } else {
        setSelectedCandidate(prev => ({ ...prev, status }));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen h-screen w-full bg-[#dda5a5] flex flex-col font-['Segoe_UI'] overflow-hidden">
      {/* Navigation Bar */}
      <Navbar onHomeClick={() => setSelectedCandidate(null)} />


      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/4 h-full bg-white border-r border-[#264143] p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-[#264143] mb-4">Candidates</h3>

          {/* Filter Section */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[#264143]">Filters</h4>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs text-[#264143] hover:text-[#1a2d2f] transition-colors"
              >
                {showFilters ? '▲ Hide' : '▼ Show'}
              </button>
            </div>

            {showFilters && (
              <>
                {/* Department Filter */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Department</label>
                  <select
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#264143]"
                  >
                    <option value="">All Departments</option>
                    {filterOptions.departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#264143]"
                  >
                    <option value="">All Status</option>
                    {filterOptions.statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                {/* Gender Filter */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Gender</label>
                  <select
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#264143]"
                  >
                    <option value="">All Genders</option>
                    {filterOptions.genders.map(gender => (
                      <option key={gender} value={gender}>
                        {gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : gender ? gender : 'Other'}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Experience */}

                {/* Work Preference Filter */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Work Preference</label>
                  <select
                    value={filters.workPref}
                    onChange={(e) => handleFilterChange('workPref', e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#264143]"
                  >
                    <option value="">All Preferences</option>
                    {filterOptions.workPrefs.map(pref => (
                      <option key={pref} value={pref}>{pref}</option>
                    ))}
                  </select>
                </div>

                {/* Date From Filter */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#264143]"
                  />
                </div>

                {/* Date To Filter */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Date To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#264143]"
                  />
                </div>

                {/* Clear Filters Button */}
                <button
                  onClick={clearFilters}
                  className="w-full text-xs bg-[#264143] hover:bg-[#1a2d2f] text-white py-1 px-2 rounded transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}

            {/* Results Count - always visible */}
            <div className="mt-2 text-xs text-gray-600 text-center">
              Showing {filteredCandidates.length} candidate(s)
            </div>
          </div>

          {/* Candidates List */}
          <ul className="space-y-2">
            {filteredCandidates.length === 0 ? (
              <li className="text-center text-gray-500 text-sm py-4">
                No candidates match the selected filters
              </li>
            ) : (
              filteredCandidates.map(c => (
                <li
                  key={c.resume_id}
                  className={`p-2 border rounded-md shadow-sm cursor-pointer transition-colors ${selectedCandidate?.resume_id === c.resume_id
                    ? 'bg-[#EDDCD9] border-[#264143]'
                    : 'hover:bg-gray-50'
                    }`}
                  onClick={() => handleCandidateSelect(c)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-[#264143]">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-gray-600">{c.email}</p>
                      <p className="text-xs text-gray-500">{c.department}</p>
                      <p className="text-xs text-gray-500">{c.experience}</p>
                      {c.status === "Advanced" && (
                        <span className="text-green-700 text-xs font-semibold">✅ Advanced</span>
                      )}
                      {c.status === "Advanced by HOD" && (
                        <span className="text-green-700 text-xs font-semibold">✅ Advanced by HOD</span>
                      )}
                      {c.status === "Under Review" && (
                        <span className="text-yellow-600 text-xs font-semibold">⏳ Under Review</span>
                      )}
                      {c.status === "Advanced for Interview" && (
                        <span className="text-red-600 text-xs font-semibold">👨‍💻 Scheduled for Interview</span>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Main Panel */}
        <div className="w-3/4 h-full p-6 overflow-y-auto">
          {!selectedCandidate ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {/* Gender Chart */}
              <div className="bg-white p-4 border-2 border-[#264143] rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#264143] mb-4">Gender Distribution (MTD)</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`gender-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Chart */}
              <div className="bg-white p-4 border-2 border-[#264143] rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#264143] mb-4">Application Status (MTD)</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`status-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Department Chart */}
              <div className="bg-white p-4 border-2 border-[#264143] rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#264143] mb-4">Department Distribution (MTD)</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      dataKey="value"
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`dept-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Submissions Bar Chart */}
              <div className="bg-white p-4 border-2 border-[#264143] rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#264143] mb-4">Submissions Over Time</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={submissionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="submissions" fill="#264143" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          ) : (
            <div className="bg-white border-2 border-[#264143] rounded-xl shadow-md p-6 space-y-4">
              <h2 className="text-2xl font-bold text-[#264143]">{selectedCandidate.first_name} {selectedCandidate.last_name}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <p>📧 {selectedCandidate.email}</p>
                <p>📍 {selectedCandidate.address}</p>
                <p>📞 {selectedCandidate.phone}</p>
                <p>🚻 {selectedCandidate.gender}</p>
                <p>🏢 {selectedCandidate.department}</p>
                <p>🎓 Grad: {selectedCandidate.grad_marks}% ({selectedCandidate.grad_year})</p>
                <p>🏫 12th: {selectedCandidate.marks12}% ({selectedCandidate.pass12})</p>
                <p>💼 Prefers: {selectedCandidate.work_pref}</p>
                <p>🧑🏻‍💻 Experience: {selectedCandidate.experience}</p>
                {selectedCandidate.linkedin && (
                  <p>🔗 <a href={selectedCandidate.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 underline">LinkedIn Profile</a></p>
                )}
              </div>

              {/* Skills */}
              <div>
                <h3 className="font-semibold text-[#264143] mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills?.map((skill, idx) => (
                    <span key={idx} className="bg-[#264143] text-white text-xs px-2 py-1 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Organizations */}
              <div>
                <h3 className="font-semibold text-[#264143] mb-2">Organizations</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.entities?.ORGANIZATION?.map((org, idx) => (
                    <span key={idx} className="bg-[#264143] text-white text-xs px-2 py-1 rounded-full">
                      {org}
                    </span>
                  ))}
                </div>
              </div>

              {/* START: MODIFIED/ADDED EXPERIENCE DISPLAY */}
              {/* Experience */}
              {selectedCandidate.experience && (
                <div>
                  <h3 className="font-semibold text-[#264143] mb-2">Experience</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-[#DE5499] text-white text-xs px-2 py-1 rounded-full">
                      {selectedCandidate.experience}
                    </span>
                  </div>
                </div>
              )}
              {/* END: MODIFIED/ADDED EXPERIENCE DISPLAY */}

              {/* Skill Match */}
              {selectedCandidate.matched_skills?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-[#264143] mb-2">Skill Match</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Matched {selectedCandidate.matched_skills.length} skills (
                    <span className="font-semibold text-[#264143]">
                      {selectedCandidate.match_percentage}%
                    </span>)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.matched_skills.map((skill, idx) => (
                      <span key={idx} className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume Preview */}
              {selectedCandidate.resume_url && (
                <div className="mt-6">
                  <div className="mt-4">
                    <a
                      href={selectedCandidate.resume_url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      ⬇️ Preview Resume (PDF)
                    </a>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-4">
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                  onClick={() => updateStatus("Advanced for Interview")}
                >
                  ✅ Advance
                </button>
                <button
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                  onClick={() => updateStatus("Rejected")}
                >
                  ❌ Reject
                </button>
              </div>

              {/* Send for review */}
              <SendForReview candidate={selectedCandidate} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
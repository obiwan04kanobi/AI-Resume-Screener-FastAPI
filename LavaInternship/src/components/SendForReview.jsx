// SendForReview.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';

// API Endpoints
const CREATE_REVIEW_LINK_API = 'http://localhost:8000/candidates/send-review';
const GET_EMPLOYEES_API = 'http://localhost:8000/employees/'; // New endpoint for employees

const SendForReview = ({ candidate }) => {
    // State for managing dropdowns and data
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);

    // State for selected values
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [primaryReviewer, setPrimaryReviewer] = useState('');
    const [ccReviewers, setCcReviewers] = useState([]);

    // State for loading and messaging
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Fetch all employees when the component mounts
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await axios.get(GET_EMPLOYEES_API);
                setEmployees(response.data);
                // Get unique department names for the department dropdown
                const uniqueDepartments = [...new Set(response.data.map(emp => emp.department))];
                setDepartments(uniqueDepartments);
            } catch (error) {
                console.error("Failed to fetch employees:", error);
                setMessage({ type: 'error', text: 'Could not load employee data.' });
            }
        };
        fetchEmployees();
    }, []);

    // Auto-select department based on the candidate's applied department
    useEffect(() => {
        if (candidate?.department && employees.length > 0) {
            const candidateDept = candidate.department;

            // Check if the department from the candidate exists in our list
            if (departments.includes(candidateDept)) {
                // Set the department state
                setSelectedDepartment(candidateDept);

                // Filter employees for that department
                const employeesInDept = employees.filter(emp => emp.department === candidateDept);
                setFilteredEmployees(employeesInDept);

                // Reset reviewer selections to avoid inconsistencies
                setPrimaryReviewer('');
                setCcReviewers([]);
            }
        }
    }, [candidate, employees, departments]); // Reruns when candidate or employee data changes


    // Handle department selection change
    const handleDepartmentChange = (e) => {
        const department = e.target.value;
        setSelectedDepartment(department);

        // Filter employees based on the selected department
        const employeesInDept = employees.filter(emp => emp.department === department);
        setFilteredEmployees(employeesInDept);

        // Reset selections
        setPrimaryReviewer('');
        setCcReviewers([]);
    };

    // Handle checkbox change for CC reviewers
    const handleCcChange = (event) => {
        const { value, checked } = event.target;
        setCcReviewers(prevCcReviewers => {
            if (checked) {
                // Add the email to the array
                return [...prevCcReviewers, value];
            } else {
                // Remove the email from the array
                return prevCcReviewers.filter(email => email !== value);
            }
        });
    };


    // Handle form submission
    // In SendForReview.js
    // In SendForReview.js

    const handleSendReview = async (e) => {
        e.preventDefault();
        if (!primaryReviewer) {
            setMessage({ type: 'error', text: 'Please select a primary reviewer.' });
            return;
        }

        setIsLoading(true);
        setMessage({ type: '', text: '' });

        // FIX: Define the payload for the API request.
        // Use `selectedDepartment` to ensure it matches the user's final selection.
        const payload = {
            resume_id: candidate.resume_id,
            reviewer_email: primaryReviewer,
            cc_emails: ccReviewers,
            candidate_name: `${candidate.first_name} ${candidate.last_name}`,
            department: selectedDepartment
        };

        // For debugging purposes
        console.log("DEBUG: Sending payload:", payload);

        try {
            const response = await axios.post(CREATE_REVIEW_LINK_API, payload);

            setMessage({ type: 'success', text: response.data.message || 'Review link sent successfully!' });

            // Reset form fields after successful submission
            setSelectedDepartment('');
            setPrimaryReviewer('');
            setCcReviewers([]);
            setFilteredEmployees([]);

        } catch (error) {
            console.error("Error sending review link:", error);
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to send review link.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-6 p-4 border-t border-gray-200">
            <h3 className="font-semibold text-[#264143] mb-3">Send for Departmental Review</h3>
            <form onSubmit={handleSendReview} className="space-y-3">
                {/* Department Dropdown */}
                <select
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#264143] transition"
                    required
                >
                    <option value="">Select a Department</option>
                    {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>

                {/* Primary Reviewer Dropdown */}
                <select
                    value={primaryReviewer}
                    onChange={(e) => setPrimaryReviewer(e.target.value)}
                    disabled={!selectedDepartment}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#264143] transition disabled:bg-gray-100"
                    required
                >
                    <option value="">Select a Primary Reviewer (To)</option>
                    {filteredEmployees.map(emp => (
                        <option key={emp.employee_id} value={emp.email}>{emp.name} ({emp.email})</option>
                    ))}
                </select>

                {/* CC Reviewers Checkbox List */}
                <div className="border border-gray-300 rounded-md p-3 space-y-2 max-h-36 overflow-y-auto">
                    <label className="block text-sm font-medium text-gray-600 mb-2">CC Reviewers (optional)</label>
                    {filteredEmployees.length > 1 ? (
                        filteredEmployees
                            .filter(emp => emp.email !== primaryReviewer) // Exclude the primary reviewer from CC list
                            .map(emp => (
                                <div key={emp.employee_id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`cc-${emp.employee_id}`}
                                        value={emp.email}
                                        checked={ccReviewers.includes(emp.email)}
                                        onChange={handleCcChange}
                                        disabled={!selectedDepartment}
                                        className="h-4 w-4 rounded border-gray-300 text-[#264143] focus:ring-[#264143]"
                                    />
                                    <label htmlFor={`cc-${emp.employee_id}`} className="ml-3 text-sm text-gray-700">
                                        {emp.name}
                                    </label>
                                </div>
                            ))
                    ) : (
                        <p className="text-sm text-gray-500 italic">No other reviewers in this department.</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !primaryReviewer}
                    className="w-full sm:w-auto bg-[#264143] text-white px-4 py-2 rounded-md hover:bg-[#1a2d2f] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Send size={16} />
                    {isLoading ? 'Sending...' : 'Send Link'}
                </button>
            </form>
            {message.text && (
                <p className={`mt-3 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {message.text}
                </p>
            )}
        </div>
    );
};

export default SendForReview;
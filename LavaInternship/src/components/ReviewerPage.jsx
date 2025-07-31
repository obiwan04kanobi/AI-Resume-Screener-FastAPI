import React, { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle } from 'lucide-react';



const VALIDATE_TOKEN_API = 'http://localhost:8000/candidates/review';
const UPDATE_STATUS_API = 'http://localhost:8000/candidates/status';

const ReviewerPage = () => {
    const [searchParams] = useSearchParams();
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const token = searchParams.get('token');
    const API_BASE_URL = 'http://localhost:8000'; // Define your API base URL

    useEffect(() => {
        const validateAndFetchCandidate = async () => {
            // You can now safely use the `token` variable from the component scope.
            if (!token) {
                setError('No review token provided. This page cannot be accessed directly.');
                setLoading(false);
                return;
            }

            try {
                // The token is already included in the API call, this is fine.
                const response = await axios.get(`${VALIDATE_TOKEN_API}?token=${token}`);
                setCandidate(response.data);
            } catch (err) {
                console.error("Validation Error:", err);
                setError(err.response?.data?.detail || 'Failed to validate the review link. It may be invalid or expired.');
            } finally {
                setLoading(false);
            }
        };

        validateAndFetchCandidate();
    }, [token]);

    const handleUpdateStatus = async (status) => {
        if (!candidate || isUpdating) return;

        setIsUpdating(true);
        try {
            await axios.patch(UPDATE_STATUS_API, {
                resume_id: candidate.resume_id,
                status: status,
            });
            setActionMessage(`Thank you. The candidate has been marked as '${status}'. You may now close this window.`);
        } catch (err) {
            console.error("Failed to update status:", err);
            setError("An error occurred while updating the candidate's status.");
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-700">Validating Link...</p>
                    <p className="text-gray-500 mt-2">Please wait while we securely load the candidate profile.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <div className="text-center bg-white p-8 rounded-lg shadow-lg border border-red-200">
                    <XCircle className="mx-auto h-12 w-12 text-red-500" />
                    <h2 className="mt-4 text-2xl font-bold text-red-800">Access Denied</h2>
                    <p className="mt-2 text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (actionMessage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
                <div className="text-center bg-white p-8 rounded-lg shadow-lg border border-green-200">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <h2 className="mt-4 text-2xl font-bold text-green-800">Action Complete</h2>
                    <p className="mt-2 text-green-700">{actionMessage}</p>
                </div>
            </div>
        );
    }

    if (!candidate) {
        return <Navigate to="/" />;
    }
    if (!candidate.job) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-yellow-50 p-4">
                <div className="text-center bg-white p-8 rounded-lg shadow-lg border border-yellow-200">
                    <XCircle className="mx-auto h-12 w-12 text-yellow-500" />
                    <h2 className="mt-4 text-2xl font-bold text-yellow-800">Job Not Found</h2>
                    <p className="mt-2 text-yellow-600">This candidate does not have a valid job associated. Please contact support.</p>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen p-4 sm:p-6 flex items-center justify-center font-['Segoe_UI']">
            <div className="w-full max-w-4xl">
                {/* --- FIX: Added max-h-[90vh] and overflow-y-auto to make this card scrollable --- */}
                <div className="bg-white border-2 border-[#264143] rounded-xl shadow-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                    <h2 className="text-2xl font-bold text-[#264143]">{candidate.first_name} {candidate.last_name}</h2>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                        <p>📧 {candidate.email}</p>
                        <p>📞 {candidate.phone}</p>
                        {/* <p>📍 {candidate.address}</p> */}
                        <p>🚻 {candidate.gender}</p>
                        <p>🏢 {candidate.job?.department}</p>
                        {/* <p>💼 Experience: {candidate.experience}</p>
                        <p>🎓 Grad: {candidate.grad_marks || 'N/A'}% ({candidate.grad_year || 'N/A'})</p>
                        <p>🏫 12th: {candidate.marks12 || 'N/A'}% ({candidate.pass12 || 'N/A'})</p>
                        <p>🏠 Prefers: {candidate.work_pref}</p>
                        {candidate.linkedin && (
                            <p>🔗 <a href={candidate.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 underline">LinkedIn Profile</a></p>
                        )} */}
                    </div>

                    {/* Skills */}
                    {/* <div>
                        <h3 className="font-semibold text-[#264143] mb-2">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {candidate.extracted_skills?.map((skill, idx) => (
                                <span key={idx} className="bg-[#264143] text-white text-xs px-2 py-1 rounded-full">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div> */}

                    {/* Organizations */}
                    {candidate.entities?.ORGANIZATION?.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-[#264143] mb-2">Organizations & Education</h3>
                            <div className="flex flex-wrap gap-2">
                                {candidate.entities.ORGANIZATION.map((org, idx) => (
                                    <span key={idx} className="bg-[#264143] text-white text-xs px-2 py-1 rounded-full">
                                        {org}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}


                    {/* Skill Match */}
                    {/* {candidate.matched_skills?.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-[#264143] mb-2">Skill Match with "{candidate.job?.jobTitle}"</h3>
                            <p className="text-sm text-gray-600 mb-2">
                                Matched {candidate.matched_skills.length} skills (
                                <span className="font-semibold text-[#264143]">
                                    {candidate.match_percentage?.toFixed(2)}%
                                </span>)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {candidate.matched_skills.map((skill, idx) => (
                                    <span key={idx} className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )} */}

                    {/* Resume Preview */}
                    {candidate.resume_url && (
                        <div className="mt-6">
                            <div className="mt-4">
                                <a
                                    // FIX: Construct the full, secure URL with the API base and review token
                                    href={`${API_BASE_URL}${candidate.resume_url}?token=${token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                >
                                    ⬇️ Preview Resume
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-center text-gray-800 mb-4">Submit Your Decision</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                                onClick={() => handleUpdateStatus("Advanced by HOD")}
                                disabled={isUpdating}
                            >
                                {isUpdating ? 'Submitting...' : '✅ Approve Candidate'}
                            </button>
                            <button
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                                onClick={() => handleUpdateStatus("Rejected by HOD")}
                                disabled={isUpdating}
                            >
                                {isUpdating ? 'Submitting...' : '❌ Reject Candidate'}
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-center text-xs text-white mt-4">
                    Accessed on {new Date().toLocaleString()}. This is a secure link.
                </p>
            </div>
        </div>
    );
};

export default ReviewerPage;
import React, { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle } from 'lucide-react';

// --- Configuration ---
// IMPORTANT: Replace with your actual API endpoint for validating the review token.
const VALIDATE_TOKEN_API = 'https://pgducqupaf.execute-api.ap-south-1.amazonaws.com/validatetoken'; // The GET /review endpoint
const UPDATE_STATUS_API = 'https://c27ubyy9fi.execute-api.ap-south-1.amazonaws.com/UpdateStatus'; // Your existing update status endpoint

const ReviewerPage = () => {
    const [searchParams] = useSearchParams();
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const validateAndFetchCandidate = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setError('No review token provided. This page cannot be accessed directly.');
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(`${VALIDATE_TOKEN_API}?token=${token}`);
                setCandidate(response.data);
            } catch (err) {
                console.error("Validation Error:", err);
                setError(err.response?.data?.error || 'Failed to validate the review link. It may be invalid or expired.');
            } finally {
                setLoading(false);
            }
        };

        validateAndFetchCandidate();
    }, [searchParams]);

    const handleUpdateStatus = async (status) => {
        if (!candidate || isUpdating) return;

        setIsUpdating(true);
        try {
            await axios.post(UPDATE_STATUS_API, {
                resume_id: candidate.resume_id,
                email: candidate.email,
                first_name: candidate.first_name,
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

    return (
        <div className="min-h-screen bg-[#dda5a5] p-6 flex items-center justify-center font-['Segoe_UI']">
            <div className="w-full max-w-4xl">
                <div className="bg-white border-2 border-[#264143] rounded-xl shadow-md p-6 space-y-4">
                    <h2 className="text-2xl font-bold text-[#264143]">{candidate.first_name} {candidate.last_name}</h2>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                        <p>📧 {candidate.email}</p>
                        <p>📍 {candidate.address}</p>
                        <p>📞 {candidate.phone}</p>
                        <p>🚻 {candidate.gender}</p>
                        <p>🏢 {candidate.department}</p>
                        <p>🎓 Grad: {candidate.grad_marks}% ({candidate.grad_year})</p>
                        <p>🏫 12th: {candidate.marks12}% ({candidate.pass12})</p>
                        <p>💼 Prefers: {candidate.work_pref}</p>
                        {candidate.linkedin && (
                            <p>🔗 <a href={candidate.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 underline">LinkedIn Profile</a></p>
                        )}
                    </div>

                    {/* Skills */}
                    <div>
                        <h3 className="font-semibold text-[#264143] mb-2">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {candidate.skills?.map((skill, idx) => (
                                <span key={idx} className="bg-[#264143] text-white text-xs px-2 py-1 rounded-full">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Organizations */}
                    {candidate.entities?.ORGANIZATION && (
                        <div>
                            <h3 className="font-semibold text-[#264143] mb-2">Organizations</h3>
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
                    {candidate.matched_skills?.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-[#264143] mb-2">Skill Match</h3>
                            <p className="text-sm text-gray-600 mb-2">
                                Matched {candidate.matched_skills.length} skills (
                                <span className="font-semibold text-[#264143]">
                                    {candidate.match_percentage}%
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
                    )}

                    {/* Resume Preview */}
                    {candidate.resume_url && (
                        <div className="mt-6">
                            <div className="mt-4">
                                <a
                                    href={candidate.resume_url}
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
                                onClick={() => handleUpdateStatus("Rejected")}
                                disabled={isUpdating}
                            >
                                {isUpdating ? 'Submitting...' : '❌ Rejected by HOD'}
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-center text-xs text-white mt-4">
                    Accessed on {new Date().toLocaleString()}. This is a secure, single-use link.
                </p>
            </div>
        </div>
    );
};

export default ReviewerPage;

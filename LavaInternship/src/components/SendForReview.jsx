import React, { useState } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';

// Replace with your actual API Gateway endpoint
const CREATE_REVIEW_LINK_API = 'https://orsugtf042.execute-api.ap-south-1.amazonaws.com/createreviewlink';

const SendForReview = ({ candidate }) => {
    const [reviewerEmail, setReviewerEmail] = useState('');
    const [ccEmails, setCcEmails] = useState(''); // New state for CC emails
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSendReview = async (e) => {
        e.preventDefault();
        if (!reviewerEmail) {
            setMessage({ type: 'error', text: 'Please enter a primary reviewer\'s email.' });
            return;
        }

        setIsLoading(true);
        setMessage({ type: '', text: '' });

        // Convert comma-separated CC string to an array of trimmed emails
        const ccEmailsArray = ccEmails.split(',').map(email => email.trim()).filter(Boolean);

        try {
            const response = await axios.post(CREATE_REVIEW_LINK_API, {
                resume_id: candidate.resume_id,
                reviewer_email: reviewerEmail,
                cc_emails: ccEmailsArray, // Pass the CC emails to the API
                candidate_name: `${candidate.first_name} ${candidate.last_name}`,
                department: candidate.department
            });

            setMessage({ type: 'success', text: response.data.message || 'Review link sent successfully!' });
            setReviewerEmail('');
            setCcEmails(''); // Clear CC field on success
        } catch (error) {
            console.error("Error sending review link:", error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to send review link.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-6 p-4 border-t border-gray-200">
            <h3 className="font-semibold text-[#264143] mb-3">Send for Departmental Review</h3>
            <form onSubmit={handleSendReview} className="space-y-3">
                <input
                    type="email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    placeholder="Primary reviewer's email (To)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#264143] transition"
                    required
                />
                {/* New CC input field */}
                <input
                    type="text"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    placeholder="Other reviewers' emails (CC), separated by commas"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#264143] transition"
                />
                <button
                    type="submit"
                    disabled={isLoading}
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
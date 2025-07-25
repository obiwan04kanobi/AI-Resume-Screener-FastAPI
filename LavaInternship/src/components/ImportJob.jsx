import React, { useState, useRef } from 'react';
import axios from 'axios';

// --- API Configuration ---
const PARSE_API_URL = "https://YOUR-API-GATEWAY-URL/parse-job-pdf"; // Replace with your actual parsing endpoint

// Helper icon for the upload box
const UploadIcon = () => (
    <svg className="w-12 h-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ImportJob = ({ onParseComplete, onSkip }) => {
    const [isParsing, setIsParsing] = useState(false);
    const [fileName, setFileName] = useState('');
    const [parseError, setParseError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            setFileName(file.name);
            setParseError('');
            handleParse(file); // Automatically start parsing
        } else {
            setParseError('Please select a valid PDF file.');
            setFileName('');
        }
    };

    const handleParse = async (file) => {
        setIsParsing(true);
        setParseError('');
        const formData = new FormData();
        formData.append('jobPdf', file);

        try {
            const response = await axios.post(PARSE_API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // On success, pass the data up to the parent component
            onParseComplete(response.data);
        } catch (error) {
            console.error('Error parsing PDF:', error);
            setParseError('Failed to parse PDF. Please check the file or try again.');
            setFileName('');
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg relative">
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Create a New Job Post</h2>
                <p className="text-center text-gray-500 mb-6">Start by uploading a Job Description PDF to save time.</p>

                <div
                    className="mt-1 flex justify-center px-6 pt-10 pb-12 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => !isParsing && fileInputRef.current.click()}
                >
                    <div className="space-y-1 text-center">
                        <UploadIcon />
                        <div className="flex text-sm text-gray-600">
                            <p className="pl-1">
                                {isParsing ? "Analyzing PDF, please wait..." : (fileName ? `Selected: ${fileName}` : "Click to upload a document")}
                            </p>
                        </div>
                        <p className="text-xs text-gray-500">PDF only, up to 10MB</p>
                    </div>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isParsing}
                />

                {parseError && <p className="text-red-500 text-sm mt-2 text-center">{parseError}</p>}
                
                {isParsing && (
                    <div className="flex justify-center items-center mt-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}
                
                <div className="mt-6 text-center">
                    <button 
                        onClick={onSkip} 
                        disabled={isParsing}
                        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                        or Skip and Fill Form Manually
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportJob;
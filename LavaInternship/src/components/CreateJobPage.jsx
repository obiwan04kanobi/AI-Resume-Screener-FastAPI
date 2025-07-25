import React, { useState } from 'react';

// Import the two components you created earlier
// I am assuming you have named them ImportJob.jsx and JobPostingForm.jsx
import ImportJob from './SmartPost'; 
import JobPostingForm from './JobPosting';

/**
 * This component manages the two-step flow for creating a job post.
 * It first shows the ImportJob modal. Once the user uploads a PDF or
 * skips, it then shows the JobPostingForm, passing along any parsed data.
 */
const CreateJobPage = () => {
    // This state determines which step of the flow is active.
    const [isImportStep, setIsImportStep] = useState(true);
    
    // This state holds the data parsed from the PDF.
    const [parsedData, setParsedData] = useState(null);

    /**
     * This function is called by the ImportJob component when the PDF
     * has been successfully parsed and returns data.
     * @param {object} data - The structured data extracted from the PDF.
     */
    const handleParseComplete = (data) => {
        setParsedData(data);    // Store the parsed data
        setIsImportStep(false); // Move to the next step (the form)
    };

    /**
     * This function is called by the ImportJob component when the user
     * decides to skip the PDF upload.
     */
    const handleSkip = () => {
        setParsedData(null);    // Ensure no data is passed to the form
        setIsImportStep(false); // Move to the next step (the form)
    };

    // Conditionally render the correct component based on the current step.
    return (
        <>
            {isImportStep ? (
                // Show the PDF import modal first.
                <ImportJob onParseComplete={handleParseComplete} onSkip={handleSkip} />
            ) : (
                // Once the import step is done, show the main form.
                // Pass the parsed data (or null if skipped) as a prop.
                <JobPostingForm initialData={parsedData} />
            )}
        </>
    );
};

export default CreateJobPage;
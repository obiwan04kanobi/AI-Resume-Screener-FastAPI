# AI Resume Portal

## Overview

AI Resume Portal is a comprehensive web application designed to streamline the entire hiring pipeline, from job posting to final candidate review. The system leverages a powerful suite of AWS services to automate resume submission, analysis, storage, and collaborative decision-making, while also keeping past candidates engaged with new opportunities.

## Team

- [Deepanshu Sharma](https://www.linkedin.com/in/deepanshu-sharma-2078532ab/)
- [Raj Srivastava](https://www.linkedin.com/in/raj-srivastava-a680482b4/) ([GitHub](https://github.com/Rajs1235))
- [Mayank Pant](https://www.linkedin.com/in/mayank04pant/) ([GitHub](https://github.com/obiwan04kanobi))


## Features

### Candidate Features
- **Job Listings**: Candidates can view all active job openings with detailed descriptions and requirements.
- **Resume Submission**:  A user-friendly form allows candidates to apply for specific roles and upload their resumes (PDF/DOC/DOCX).
- **Instant Feedback**: Candidates receive an email confirmation upon successful submission.
- **Automated Job Recommendations**: Candidates who have applied in the last year receive a consolidated email at 9:30 AM daily with new job postings relevant to their previously applied departments.

### HR Features
- **Secure HR Portal**: HR professionals log in through a secure portal managed by AWS Cognito.
- **Centralized Dashboard**: A main dashboard provides a high-level overview of application statistics, with charts filtered for the last 30 days of activity.
- **Job Posting**: A dedicated form for HR to create and publish new job listings with detailed requirements, responsibilities, and salary information.
- **Job Management**: An interface to view all created jobs, see submission counts, and toggle their status between 'Active' and 'Inactive', or **permanently delete** them.
- **Comprehensive Candidate Database**: Access to a searchable and filterable database of the **entire talent pool**, including all-time data for both 'Rejected' and 'Advanced' candidates.
- **Collaborative Departmental Review**:
    - HR can send a candidate's profile to a department head (HOD) or other stakeholders for review.
    - This is done via a secure, **authenticated link sent by email**, which has a **10-day time-to-live (TTL)**.
    - The reviewer can approve or reject the candidate directly from the link, updating the status in real-time.

## Security Practices
The application is built with a strong emphasis on security, adhering to AWS best practices:

- **Identity and Access Management (IAM)**: Each Lambda function is assigned a unique IAM role with permissions configured according to the principle of least privilege. For example, the `ResumeUploadFunction` only has permissions to write to S3 and DynamoDB, but cannot read or delete other resources, minimizing the potential impact of any single component being compromised.

- **Data Protection**:
  - **Private S3 Bucket**: All candidate resumes are stored in a private S3 bucket, which is not publicly accessible.
  - **Presigned URLs**: The application uses S3 presigned URLs to provide secure, time-limited access for both uploading and viewing resumes. This ensures that direct, unauthorized access to the files is prevented. The GET URLs for viewing resumes are valid for 15 days.

- **Authentication and Authorization**: 
  - **AWS Cognito**: The entire HR portal is protected by AWS Cognito, which manages user authentication, session handling, and authorization, ensuring only authenticated HR personnel can access sensitive candidate data and management features.

- **Secure Credentials Management**:
  - **AWS Secrets Manager**: Highly sensitive credentials, such as the secret key for signing JWTs in the review workflow, are securely stored and retrieved at runtime using AWS Secrets Manager, preventing them from being exposed in code or environment variables.

- **Network Security**:
  - **CORS**: Cross-Origin Resource Sharing (CORS) policies are configured on the S3 bucket and API Gateway to only allow requests from the authenticated frontend domain, preventing unauthorized web clients from interacting with the resources.

## Cost Optimization
The architecture is designed to be highly cost-effective by leveraging serverless technologies and best practices:

- **Serverless-First Approach**: The entire backend runs on AWS Lambda, which means there are no idle servers to pay for. Code executes only when needed (e.g., when a form is submitted or an API is called), and costs are calculated based on the number of requests and execution duration in milliseconds.

- **Right-Sized Lambda Functions**: Each Lambda function is configured with a specific memory allocation tailored to its workload. For instance, simple functions that update a database item use minimal memory (e.g., 128MB), while more intensive functions like the `ResumeProcessorFunction` are allocated more 

- **On-Demand DynamoDB**: All DynamoDB tables are configured to use On-Demand capacity mode. This is a highly cost-effective strategy for applications with unpredictable traffic patterns, as it automatically scales throughput up or down and eliminates the need to pay for provisioned capacity that might go unused.

- **Automated Data Lifecycle Management**:
  - **DynamoDB TTL**: The `ReviewTokens` table uses a Time to Live (TTL) attribute. This automatically deletes expired token records from the table at no cost, preventing the table from growing indefinitely with stale data.

## AWS Integration & Architecture
The system is deployed in the **ap-south-1 (Mumbai)** region and consists of the following components: 
1. **Frontend**:
    - Built with React and TailwindCSS.
    - Hosted and managed by AWS Amplify for CI/CD and seamless integration with AWS services.
    - Provides interfaces for candidates (Job Listings, Application Form) and HR users (Dashboard, Job Management, etc.).
    - Communicates with the backend exclusively through API Gateway.

2. **Backend**:
- **API Gateway**: Serves as the secure entry point for all frontend requests, routing them to the appropriate Lambda functions.
- **AWS Lambda Functions**: A suite of single-purpose functions that form the core of the application logic:
  - **Data Ingestion & Processing**:
    - `ResumeUploadFunction`: Receives candidate data, generates a presigned URL for S3, and creates an initial record in DynamoDB.
    - `ResumeProcessorFunction`: Triggered by S3 uploads, this function uses AWS Textract and Comprehend to analyze resumes, extract skills and entities, and updates the candidate's record in DynamoDB.
    - `JobPostingFunction`: Creates new job listings in the database.
  - **Data Retrieval & Management**: 
    - `JobListingFunction`: Fetches and groups all active job postings for the candidate view.
    - `getResumeEntities`: Powers the HR dashboard and candidate database by fetching all candidate data and enriching it with job details and skill-match percentages.
    - `UpdateJobPostingStatus`: Handles activating, deactivating, modifying, and deleting job posts.
    - `UpdateApplicantStatus`: Updates a candidate's status (e.g., "Advanced", "Rejected") and sends automated, context-aware email notifications.
  - **Collaborative Workflow & Notifications**:
    - `SendForReviewFunction`: Generates a secure, time-limited JWT, stores it in a dedicated DynamoDB table, and emails a review link to stakeholders.
    - `ValidateReviewTokenFunction`: Verifies the JWT from the review link, checks its validity in DynamoDB, and securely serves the candidate's data.
    - `DailyJobRecommendationsFunction`: Triggered daily by EventBridge, this function scans for new jobs and recent candidates to send consolidated recommendation emails.
- **Amazon EventBridge**: A scheduled rule (cron job) invokes the DailyJobRecommendationsFunction every morning at 9:30 AM to automate candidate engagement.

3. **Core AWS Services**:
  - **S3 Bucket**: Provides durable, secure, and private storage for all uploaded resume files.
  - **DynamoDB**: Three core tables power the application: a table for candidate/resume metadata, another for job postings, and a third for the temporary review tokens (with TTL enabled for automatic cleanup).
  - **Cognito**: Manages all aspects of authentication and authorization for the secure HR Portal.
  - **Secrets Manager**: Securely stores the JWT secret key, decoupling it from the application code.


## AWS Backend Architecture

![aws backend architecture](/screenshots/ai-resume-screener.png)

## React Frontend + API's Integration

![React Frontend](/screenshots/frontend-diagram.png)

## Screenshots

![home](/screenshots/home.png)
-----
![hr-signup-login](/screenshots/Cognito-Signup-login.png)
----- 
![dashboard-home](/screenshots/dashboard-home.png)
----- 
![dashboard-candidate-view](/screenshots/candidate-dashboard-view.png)
----- 
![job-posting-form](/screenshots/post-job.png)
----- 
![job listing](/screenshots/job-listings.png)
----- 
![job listing detail](/screenshots/job-listings-detail.png)
----- 
![resume form](/screenshots/resume-upload-form.png)
----- 
![manage-jobs](/screenshots/manage-jobs.png)
-----
![candidate-database](/screenshots/candidate-database.png)
-----

## Installation

### Prerequisites
- Node.js and npm installed.
- AWS account with necessary permissions.
- Amplify CLI (`npm install -g @aws-amplify/cli`)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/obiwan04kanobi/LavaInternship.git
   cd LavaInternship
    ```

2. Install dependencies:
   ```bash
    npm install
    ```

3. Initialize and deploy with Amplify:
   ```bash
    amplify init
    amplify push
    ```

4. Start the development server:
   ```bash
    npm run dev
    ```

5. Publish to production:
    ```
    amplify publish
    ```

## Usage
### Candidate Workflow

1. Navigate to the Job Listings page.
2. Browse active jobs and click "Apply Now".
3. Fill out the submission form and upload a resume.
4. Receive a confirmation email and subsequent daily emails for new, relevant job postings.

### HR Workflow
1. Navigate to the homepage and select "HR".
2. Log in using AWS Cognito.
3. Access the dashboard to view analytics and new candidates.
4. Use the "Post Job" form to create new openings.
5. Use the "Manage Jobs" page to toggle the visibility of or delete job listings.
6. Use the "Candidate Database" to search the entire talent pool.
7. When viewing a candidate, send a review link to a department head for collaborative feedback.

## Contributing
Contributions are not being accepted for this project at this time.

## Contact

For questions or support, please connect with any of us:

- [Deepanshu Sharma](https://www.linkedin.com/in/deepanshu-sharma-2078532ab/)
- [Raj Srivastava](https://www.linkedin.com/in/raj-srivastava-a680482b4/) ([GitHub](https://github.com/Rajs1235))
- [Mayank Pant](https://www.linkedin.com/in/mayank04pant/) ([GitHub](https://github.com/obiwan04kanobi))


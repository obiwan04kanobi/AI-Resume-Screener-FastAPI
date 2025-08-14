# AI Resume Portal (FastAPI Version)

## Overview

AI Resume Portal is a comprehensive web application designed to streamline the entire hiring pipeline, from job posting to final candidate review. The system is built with a powerful **FastAPI backend** and leverages AWS services to automate resume submission, analysis, and storage, ensuring a smooth and efficient process for both candidates and the HR team.

## Team

  - [Deepanshu Sharma](https://www.linkedin.com/in/deepanshu-sharma-2078532ab/)([GitHub](https://github.com/Deepanshu-0052))
  - [Raj Srivastava](https://www.linkedin.com/in/raj-srivastava-a680482b4/) ([GitHub](https://github.com/Rajs1235))
  - [Mayank Pant](https://www.linkedin.com/in/mayank04pant/) ([GitHub](https://github.com/obiwan04kanobi))

## Features

### Candidate Features

  - **Job Listings**: Candidates can view all active job openings, grouped by department, with detailed descriptions and requirements.
  - **Resume Submission**: A user-friendly form allows candidates to apply for specific roles and upload their resumes directly.
  - **Instant Feedback**: Candidates receive an email confirmation upon successful submission of their application.

### HR Features

  - **Secure HR Portal**: HR professionals sign up and log in through a secure, custom-built authentication portal.
  - **Smart Job Posting** ✨: Instead of manually typing job details, HR can simply upload a Job Description (JD) PDF. The system uses **AWS Textract** to intelligently parse the document's forms, tables, and raw text, automatically filling out the job posting form with the correct details like job title, department, responsibilities, and qualifications.
  - **Job Posting & Management**: A dedicated interface allows HR to create, publish, update, and manage job listings.
  - **Centralized Candidate Database**: Access a comprehensive and filterable database of the entire talent pool. The system calculates a skill match percentage for each candidate against the job requirements.
  - **Collaborative Departmental Review**:
      - HR can send a candidate's profile to a department head (HOD) or other stakeholders for review.
      - This is done via a secure, **JWT-based link sent by email**, which has a **10-day time-to-live (TTL)**.
      - The reviewer can view the candidate's full profile directly from the link, and the system updates the candidate's status in real-time based on their feedback.
  - **Automated Status Updates**: Candidates are automatically notified via professional HTML emails when their application status changes (e.g., "Advanced by HOD", "Rejected", "Advanced for Interview").

-----

## Technology Stack & Architecture

The application is architected with a modern Python backend and a reactive frontend, leveraging powerful cloud services for intelligent processing.

1.  **Backend (FastAPI)**:

      * The core of the application is a robust API built with **FastAPI**, providing a high-performance, asynchronous backend.
      * **SQLAlchemy ORM** is used for all database interactions, mapping Python objects to a relational database schema (`models.py`, `crud.py`).
      * The API is organized into modular routers for clear separation of concerns: `Jobs`, `Candidates`, `Employees`, and `Authentication`.
      * Long-running tasks, such as resume analysis, are handled in the background using FastAPI's `BackgroundTasks` to ensure the API remains responsive.

2.  **Frontend**:

      * A dynamic and responsive user interface built with **React** and **TailwindCSS**.
      * Hosted and managed by AWS Amplify for CI/CD and seamless integration with the backend.

3.  **Core AWS Services**:

      * **Amazon S3**: Provides durable and secure storage for all uploaded resume files.
      * **AWS Textract**: Used to analyze and extract text content from resume documents and job description PDFs.
      * **AWS Comprehend**: Performs natural language processing on the extracted text to identify key entities (like names, locations) and skills.

-----

## Security Practices

The application is built with a strong emphasis on modern security practices:

  - **Authentication & Authorization**:

      - A custom authentication system is implemented for the HR portal.
      - User signup is protected with an **email verification code** system to prevent spam and verify identity.
      - Secure endpoints are protected using **JSON Web Tokens (JWT)**, which are issued upon successful login and required for all sensitive operations.

  - **Password Security**:

      - User passwords are never stored in plaintext. They are securely hashed using the industry-standard **bcrypt** algorithm via the `passlib` library.

  - **Data Protection**:

      - Resumes are stored in a secure location, and access is managed by the backend to prevent unauthorized direct access.
      - The collaborative review feature uses short-lived, signed JWTs to provide secure, temporary access to candidate profiles for external stakeholders.

  - **API Security**:

      - **Cross-Origin Resource Sharing (CORS)** is configured in the FastAPI application to only allow requests from the authorized frontend domain, preventing unauthorized clients from interacting with the API.
      - Data validation is enforced at the API level using **Pydantic** models to protect against malformed data and injection attacks.

  - **Secure Credentials Management**:

      - All sensitive credentials (Database URLs, AWS Keys, JWT Secrets) are managed via environment variables and loaded securely using Pydantic's `BaseSettings`, ensuring they are never hard-coded in the application.

-----

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
![smart-post](/screenshots/smart-post.png)
-----

## Local Installation & Setup

### Prerequisites

  * **Docker and Docker Compose**: Ensure you have both installed on your system.
  * **Git**: For cloning the repository.
  * **AWS Account**: You'll need credentials for AWS services like Textract, Comprehend, and S3.

### Dockerized Setup with Docker Compose

This is the recommended method to run the application locally, as it sets up the database, backend, and frontend in one go.

1.  **Clone the Repository**
    Open your terminal and clone the project repository:

    ```bash
    git clone https://github.com/obiwan04kanobi/AI-Resume-Screener-FastAPI.git
    cd AI-Resume-Screener-FastAPI
    ```

2.  **Configure Environment Variables**
    The backend service requires credentials to connect to AWS and other services.

      * Navigate to the `FastApi/` directory.
      * Create a new file named `.env`.
      * Add the required environment variables to this file. The `DATABASE_URL` is already configured to work within Docker, so you only need to add your AWS and other secrets.

    required `.env` file content:

    ```env
    # In FastApi/.env
    # --- DATABASE ---
    DATABASE_URL="mssql+pyodbc://sa:W^L1*hIGs0sisL9h@resume_screener_db:1433/resume_portal?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"

    #----LOCAL FILE UPLOAD LOCATION ------
    LOCAL_UPLOAD_DIR= "/app/uploads"

    # --- AWS CREDENTIALS ---
    AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
    AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY
    AWS_REGION=ap-south-1
    BUCKET_NAME=your-s3-bucket-name

    # --- EMAIL ---
    SMTP_EMAIL="your_email@example.com"
    SMTP_PASSWORD="your_email_password" # Use a Google App Password
    SMTP_SERVER="smtp.gmail.com"
    SMTP_PORT=587

    # --- JWT FOR REVIEW LINKS ---
    JWT_SECRET="your_super_secret_jwt_key"
    FRONTEND_REVIEW_URL="http://localhost:5173/review"

    # --- APPLICATION ---
    JOB_LISTINGS_URL="http://localhost:5173/jobs-listings" # Your frontend jobs page URL
    ```

3.  **Build and Run the Containers**
    From the **root directory** of the project (where the `docker-compose.yml` file is located), run the following command:

    ```bash
    docker-compose up --build
    ```

    This command will:

      * Build the Docker images for the FastAPI backend and the React frontend.
      * Start the SQL Server database and run the initialization script.
      * Start the backend and frontend services.

    You can add a `-d` flag (`docker-compose up --build -d`) to run the containers in detached mode (in the background).

4.  **Access the Application**
    Once all the containers are up and running, you can access the services in your browser:

      * **Frontend Application**: [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173)
      * **Backend API Docs**: [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)

-----

## Contributing

Contributions are not being accepted for this project at this time.

## Contact

For questions or support, please connect with any of us:

  - [Deepanshu Sharma](https://www.linkedin.com/in/deepanshu-sharma-2078532ab/)([GitHub](https://github.com/Deepanshu-0052))
  - [Raj Srivastava](https://www.linkedin.com/in/raj-srivastava-a680482b4/) ([GitHub](https://github.com/Rajs1235))
  - [Mayank Pant](https://www.linkedin.com/in/mayank04pant/) ([GitHub](https://github.com/obiwan04kanobi))

IF NOT EXISTS (
    SELECT name 
    FROM sys.databases 
    WHERE name = N'resume_portal'
)
BEGIN
    CREATE DATABASE resume_portal;
END
GO

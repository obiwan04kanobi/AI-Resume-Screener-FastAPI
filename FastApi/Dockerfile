# 1. Use official Python slim image
FROM python:latest

# 2. Set the working directory
WORKDIR /app

# 3. Install system dependencies for pyodbc + SQL Server ODBC Driver
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    apt-transport-https \
    unixodbc \
    unixodbc-dev \
    gcc \
    g++ \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# 4. Install Microsoft ODBC Driver 18 for SQL Server
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl https://packages.microsoft.com/config/debian/11/prod.list \
      > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18 && \
    rm -rf /var/lib/apt/lists/*

# 5. Copy Python dependencies
COPY ./requirements.txt /app/requirements.txt

# 6. Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 7. Copy project files
COPY ./app /app/app

# 8. Add wait-for-db script
COPY ./wait-for-db.sh /app/wait-for-db.sh
RUN chmod +x /app/wait-for-db.sh

# 9. Expose FastAPI default port
EXPOSE 8000

# 10. Run the wait script before starting FastAPI
CMD ["/bin/bash", "/app/wait-for-db.sh", "mssql", "1433", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

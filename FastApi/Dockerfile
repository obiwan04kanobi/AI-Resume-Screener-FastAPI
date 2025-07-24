# 1. Use official Python image
FROM python:3.11-slim

# 2. Set the working directory
WORKDIR /app

# 3. Install dependencies
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy all project files
COPY ./app /app/app

# 5. Expose the FastAPI default port
EXPOSE 8000

# 6. Run the FastAPI app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
FROM python:3.10-slim

WORKDIR /app

# Upgrade pip and install dependencies directly
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir fastapi uvicorn sqlalchemy qrcode pillow pydantic geopy

# Copy backend files
COPY . .

# Expose port for FastAPI
EXPOSE 8000

# Start Uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

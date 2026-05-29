FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Create PID directory for meter_ctl.py process tracking
RUN mkdir -p /tmp/miyahi

CMD ["python", "-m", "app"]


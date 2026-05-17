FROM eclipse-mosquitto:2

# Copy config and set correct ownership for the mosquitto user
COPY config/mosquitto.conf /mosquitto/config/mosquitto.conf

# Generate the password file with correct permissions inside the container
RUN mosquitto_passwd -b -c /mosquitto/config/pwfile miyahi_backend backend_secret_2026 && \
    chown mosquitto:mosquitto /mosquitto/config/pwfile && \
    chmod 600 /mosquitto/config/pwfile

# ─────────────────────────────────────────────
# Stage 1: Build React frontend
# ─────────────────────────────────────────────
FROM node:20-alpine AS react-builder

WORKDIR /app/caption-app
COPY caption-app/package*.json ./
RUN npm ci

COPY caption-app/ ./
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Build Go backend
# ─────────────────────────────────────────────
FROM golang:1.24-alpine AS go-builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY *.go ./
RUN go build -o server .

# ─────────────────────────────────────────────
# Stage 3: Final image (Python + Go + static files)
# ─────────────────────────────────────────────
FROM python:3.11-slim

# Install supervisord to manage multiple processes
RUN apt-get update && apt-get install -y \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies and install
COPY requirements.txt ./
RUN pip install --no-cache-dir --timeout 120 \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir --timeout 120 -r requirements.txt

# Copy Python source files
COPY app.py ./
COPY inference.py ./
COPY cnn_encoder_decoder_captioning.py ./

# Copy Go binary
COPY --from=go-builder /app/server ./server
RUN chmod +x ./server

# Copy React build output to be served by Go
COPY --from=react-builder /app/caption-app/build ./static

# Copy supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

COPY checkpoints/ /app/checkpoints/

RUN chmod -R 755 /app/checkpoints

# HuggingFace Spaces requires port 7860
EXPOSE 7860

# Run both services via supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

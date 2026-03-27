---
title: Custom Image Captioning
emoji: 🖼️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Custom Image Captioning Model

Upload an image and get an AI-generated caption using a custom-trained CNN encoder-decoder model.

## Architecture

```
Browser (React UI)
      │
      ▼
Go Web Server  (:7860)   ← HuggingFace sees this port
      │  serves static React files
      │  proxies /api/* →
      ▼
Python Flask/FastAPI  (:8000, internal)
      │
      ▼
CNN Encoder-Decoder Model
```

## Local Development

```bash
# Build and run everything
docker compose up --build

# Or run only backend services (React in dev mode)
docker compose --profile dev up --build
```

## Deploy to HuggingFace Spaces

```bash
# 1. Create a new Space at https://huggingface.co/spaces
#    SDK: Docker | Hardware: CPU Basic (free) or GPU if needed

# 2. Clone your Space
git clone https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME

# 3. Copy your project files in
cp -r ~/custom_captioning_model/* YOUR_SPACE_NAME/

# 4. Push
cd YOUR_SPACE_NAME
git add .
git commit -m "Initial deployment"
git push
```

HuggingFace will automatically build the Docker image and run it.

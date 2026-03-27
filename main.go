package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	pythonServiceURL = "http://localhost:8000/caption"
	maxRequestSize   = 10 << 20 // 10MB
	requestTimeout   = 45 * time.Second
)

type ImageRequest struct {
	ImageBase64 string `json:"image_base64" binding:"required"`
	CaptionMode string `json:"caption_mode"`
}

type CaptionResponse struct {
	Caption string `json:"caption"`
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 1. Serve Static Files (The React Build)
	r.Static("/static", "./static/static")
	r.StaticFile("/favicon.ico", "./static/favicon.ico")
	r.StaticFile("/manifest.json", "./static/manifest.json")
	r.StaticFile("/logo192.png", "./static/logo192.png")

	// 2. Health Check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	// 3. Image Processing Proxy
	r.POST("/process", func(c *gin.Context) {
		var req ImageRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
			return
		}

		caption, err := getCaptionFromPython(req)
		if err != nil {
			log.Printf("Python API Error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "AI model failed to respond"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"caption": caption})
	})

	// 4. Default Route (Serves React App for all other paths)
	r.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})

	log.Println("Server running on port 7860")
	r.Run(":7860")
}

func getCaptionFromPython(req ImageRequest) (string, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", pythonServiceURL, bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("python service returned status %d", resp.StatusCode)
	}

	var res CaptionResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	return res.Caption, nil
}

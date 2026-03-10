import { useEffect, useRef, useState } from "react";
import axios from "axios";

const Photobooth = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isPhotoCaptured, setIsPhotoCaptured] = useState(false);

  // Start the webcam
  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  }

  // Capture an image from the video stream and draw it on the canvas
  async function captureImage() {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      const aspectRatio = video.videoWidth / video.videoHeight;
      const width = 600; // Adjust the width as needed
      const height = Math.floor(width / aspectRatio / 8) * 8; // Adjust to match aspect ratio

      // Set the canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, width, height);

      // Extract the image as a base64 string
      const imageDataUrl = canvas.toDataURL("image/png");

      // Set the captured image
      setCapturedImage(imageDataUrl);
      setIsPhotoCaptured(true);
    }
  }

  // Function to send the image to the server
  async function sendImageToServer() {
    if (capturedImage) {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}api/order/print-pic`,
          {
            image: capturedImage,
          }
        );
        if (response.data.status === "success") {
          console.log("Image sent to server for printing.");
        } else {
          console.error(
            "Error sending image to server:",
            response.data.message
          );
        }
      } catch (error) {
        console.error("Error sending image to server:", error);
      }
    }
  }

  useEffect(() => {
    startWebcam();
  }, []);

  return (
    <div className="photo-booth">
      <video ref={videoRef} autoPlay muted className="video-stream" />
      <canvas ref={canvasRef} className="hidden" />

      <div className="controls">
        <button onClick={captureImage}>Capture Photo</button>
        <button onClick={sendImageToServer} disabled={!isPhotoCaptured}>
          {isPhotoCaptured ? "Send to Printer" : "Capture Photo First"}
        </button>
      </div>
    </div>
  );
};

export default Photobooth;

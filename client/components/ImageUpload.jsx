import { useState, useRef } from "react";
// Simple icon components using Unicode symbols
const Upload = ({ className }) => <span className={className}>📤</span>;
const X = ({ className }) => <span className={className}>✖️</span>;
const ImageIcon = ({ className }) => <span className={className}>🖼️</span>;
import Button from "./Button";
import { compressImage } from "../utils/imageCompression";

/* global FileReader, alert */

export default function ImageUpload({ sendImageMessage, isSessionActive }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [analyzingImages, setAnalyzingImages] = useState(new Set());
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        processImage(file);
      }
    });
  };

  const processImage = async (file) => {
    setIsUploading(true);
    
    try {
      console.log(`💰 Compressing image before uploading to reduce OpenAI costs...`);
      const compressed = await compressImage(file);
      
      const imageInfo = {
        id: crypto.randomUUID(),
        name: file.name,
        size: compressed.compressedSize,
        originalSize: compressed.originalSize,
        data: compressed.dataUrl,
        preview: compressed.dataUrl,
        timestamp: new Date().toLocaleTimeString(),
        compressionRatio: compressed.compressionRatio,
      };
      
      setUploadedImages((prev) => [...prev, imageInfo]);
      setIsUploading(false);
    } catch (error) {
      console.error('Error compressing image:', error);
      // Fallback to original method if compression fails
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const imageData = e.target.result;
        const imageInfo = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          data: imageData,
          preview: imageData,
          timestamp: new Date().toLocaleTimeString(),
        };
        
        setUploadedImages((prev) => [...prev, imageInfo]);
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (id) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const analyzeImage = async (imageData, imageName, imageId) => {
    if (!isSessionActive) {
      alert("Please start a session first");
      return;
    }
    
    // Add image to analyzing set
    setAnalyzingImages(prev => new Set([...prev, imageId]));
    
    try {
      // Extract media type and base64 data from data URL
      const [header, base64Data] = imageData.split(",");
      const mediaType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
      
      console.log("🖼️ Analyzing image:", { imageName, mediaType, dataLength: base64Data.length });
      
      await sendImageMessage(
        {
          type: "base64",
          media_type: mediaType,
          data: base64Data,
        },
        `Please wait, analyze this image: ${imageName}`
      );
    } catch (error) {
      console.error("Error analyzing image:", error);
    } finally {
      // Remove image from analyzing set
      setAnalyzingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Image Upload</h2>
      
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${!isSessionActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={isSessionActive ? onButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="hidden"
          disabled={!isSessionActive}
        />
        
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isSessionActive
              ? "Drag & drop images here or click to select"
              : "Start a session to upload images"}
          </p>
          <p className="text-xs text-gray-400">
            Supports JPG, PNG, GIF, WebP
          </p>
        </div>
        
        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
            <div className="text-sm text-gray-600">Processing...</div>
          </div>
        )}
      </div>

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">
              Uploaded Images ({uploadedImages.length})
            </h3>
            {analyzingImages.size > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing {analyzingImages.size} image{analyzingImages.size > 1 ? 's' : ''}...</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {uploadedImages.map((image) => (
              <div
                key={image.id}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={image.preview}
                    alt={image.name}
                    className="w-16 h-16 object-cover rounded border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {image.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(image.size / 1024).toFixed(1)} KB
                      {image.compressionRatio && (
                        <span className="text-green-600 ml-1">
                          (-{image.compressionRatio}%)
                        </span>
                      )}
                      • {image.timestamp}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => analyzeImage(image.data, image.name, image.id)}
                        className={`text-xs px-3 py-1 ${
                          analyzingImages.has(image.id) 
                            ? "bg-gray-400 cursor-not-allowed" 
                            : "bg-blue-500"
                        }`}
                        icon={<ImageIcon height={12} />}
                        disabled={analyzingImages.has(image.id)}
                      >
                        {analyzingImages.has(image.id) ? "Analyzing..." : "Analyze"}
                      </Button>
                      <Button
                        onClick={() => removeImage(image.id)}
                        className="bg-red-500 text-xs px-3 py-1"
                        icon={<X height={12} />}
                        disabled={analyzingImages.has(image.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-1">How to use:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Start a session first</li>
          <li>• Upload images by dragging or clicking</li>
          <li>• Click "Analyze" to get AI insights</li>
          <li>• Use voice input for follow-up questions</li>
        </ul>
      </div>
    </div>
  );
} 
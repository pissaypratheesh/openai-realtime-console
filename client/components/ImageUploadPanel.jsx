import { useState, useRef, useEffect } from "react";
import { Image, X } from "react-feather"; // Import X icon for close button

/* global setTimeout, alert, FileReader */

export default function ImageUploadPanel({ isSessionActive, sendImageMessage }) {
  const fileInputRef = useRef(null);
  const [imageUploadStatus, setImageUploadStatus] = useState('idle'); // idle, processing, success, error, analyzing
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null); // New state for image preview
  const [isModalOpen, setIsModalOpen] = useState(false); // New state for modal visibility
  // Removed isPanelExpanded state

  const handleImageUploadClick = () => {
    if (!isSessionActive) {
      alert("Please start a session before uploading an image.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImageUploadStatus('processing');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      const mediaType = file.type; // e.g., "image/png"
      setUploadedImagePreview(base64String); // Set image preview

      try {
        setImageUploadStatus('analyzing');
        await sendImageMessage({ media_type: mediaType, data: base64String.split(',')[1] });
        setImageUploadStatus('success');
        setTimeout(() => {
          setImageUploadStatus('idle');
          // Do NOT clear preview after success, keep it for potential modal view
        }, 3000); // Reset status after 3 seconds, but keep image preview
      } catch (error) {
        console.error("Error sending image message:", error);
        setImageUploadStatus('error');
        setTimeout(() => {
          setImageUploadStatus('idle');
          setUploadedImagePreview(null); // Clear preview on error
        }, 5000);
        alert("Failed to upload image. Please try again.");
      }
    };
    reader.readAsDataURL(file);
  };

  const getStatusMessage = () => {
    switch (imageUploadStatus) {
      case 'processing':
        return 'Uploading...';
      case 'analyzing':
        return 'Analyzing...';
      case 'success':
        return 'Uploaded!';
      case 'error':
        return 'Failed!';
      default:
        return ''; // No message when idle
    }
  };

  const getStatusColorClass = () => {
    switch (imageUploadStatus) {
      case 'processing':
        return 'text-yellow-600';
      case 'analyzing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return '';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      {(imageUploadStatus !== 'idle' && imageUploadStatus !== 'success') && ( // Show message for processing, analyzing, error
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColorClass()} bg-white shadow-md`}>
          {getStatusMessage()}
        </div>
      )}
      
      {uploadedImagePreview && ( // Conditionally render image preview
        <div 
          className="relative bg-white p-2 rounded-lg shadow-md cursor-pointer"
        >
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent opening modal
              setUploadedImagePreview(null); // Clear preview
              setImageUploadStatus('idle'); // Reset status
            }}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 z-10"
            title="Remove Image Preview"
          >
            <X height={16} width={16} />
          </button>
          <img 
            src={uploadedImagePreview} 
            alt="Uploaded Preview" 
            className="max-w-[150px] max-h-[150px] object-contain" 
            onClick={() => setIsModalOpen(true)} // Open modal on image click
          />
        </div>
      )}

      <button
        onClick={handleImageUploadClick}
        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center cursor-pointer text-white"
        title="Upload Image"
        disabled={imageUploadStatus === 'processing' || imageUploadStatus === 'analyzing'}
      >
        <Image height={24} width={24} />
      </button>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Full-screen Image Modal */}
      {isModalOpen && uploadedImagePreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]"
          onClick={() => setIsModalOpen(false)} // Close modal when clicking outside image
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] bg-white p-4 rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking on the content
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 p-2 rounded-full bg-gray-600 text-white hover:bg-gray-700"
              title="Close Image"
            >
              <X height={24} width={24} />
            </button>
            <img 
              src={uploadedImagePreview} 
              alt="Full Size Preview" 
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
} 
import React from 'react';
import { FiX, FiVideo } from 'react-icons/fi';
import './VideoModal.css';

const VideoModal = ({ roomId, title, onClose }) => {
  // Use Jitsi Meet embedded UI
  // Generate a secure, unique room URL based on the appointment ID
  const roomUrl = `https://meet.jit.si/HealthVaultConsultation_${roomId}`;

  return (
    <div className="video-modal-overlay">
      <div className="video-modal-container">
        <div className="video-modal-header">
          <h3>
            <FiVideo className="text-primary" />
            {title || 'Secure Video Consultation'}
          </h3>
          <button className="close-btn" onClick={onClose} title="End Call">
            <FiX size={20} />
          </button>
        </div>
        <div className="video-modal-body">
          <iframe
            src={roomUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="video-container"
            title="Video Consultation"
          />
        </div>
      </div>
    </div>
  );
};

export default VideoModal;

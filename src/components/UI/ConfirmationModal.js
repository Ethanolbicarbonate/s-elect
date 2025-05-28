// src/components/UI/ConfirmationModal.js
"use client";

import { useEffect } from 'react';

export default function ConfirmationModal({
  show,
  onClose,
  onConfirm,
  title = "Confirm Action",
  bodyText = "Are you sure you want to proceed with this action?",
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  confirmButtonVariant = "primary", // e.g., "danger", "success", "warning"
  isConfirming = false, // To show a loading state on the confirm button
}) {

  // Effect to handle Escape key for closing the modal
  useEffect(() => {
    if (!show) return;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [show, onClose]);
  
  // Effect to add/remove class from body to prevent scrolling
  useEffect(() => {
    if (show) {
      document.body.classList.add("modal-open-custom"); // Use your existing class if defined elsewhere
    } else {
      document.body.classList.remove("modal-open-custom");
    }
    return () => document.body.classList.remove("modal-open-custom");
  }, [show]);


  if (!show) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="modal-backdrop-blur fade show" // Use your existing backdrop class
        style={{ zIndex: 1060 }} // Ensure backdrop is high enough but below modal
        onClick={!isConfirming ? onClose : undefined} // Close on backdrop click if not confirming
      ></div>

      {/* Modal Dialog */}
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-labelledby="confirmationModalTitle"
        aria-modal="true"
        style={{ zIndex: 1065 }} // Ensure modal is above its backdrop and other modals if any
        onClick={!isConfirming ? onClose : undefined} // Close on outer modal area click
      >
        <div 
          className="modal-dialog modal-dialog-centered" // Vertically centered
          role="document"
          onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside modal content
        >
          <div className="modal-content shadow-lg rounded-3 border-0">
            <div className="modal-header rounded-top-3 bg-white border-bottom-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
                    backgroundSize: "6px 6px",
                  }}
                >
              <h5 className="modal-title" id="confirmationModalTitle">
                {title}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
                disabled={isConfirming}
              ></button>
            </div>
            <div className="modal-body py-4 px-4">
              <p className="mb-0">{bodyText}</p>
            </div>
            <div className="modal-footer rounded-bottom-3 bg-white border-top-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
                    backgroundSize: "6px 6px",
                  }}
                >
              <button
                type="button"
                className="btn custom-btn btn-md text-secondary border"
                onClick={onClose}
                disabled={isConfirming}
              >
                {cancelButtonText}
              </button>
              <button
                type="button"
                className={`btn btn-${confirmButtonVariant}`}
                onClick={onConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  confirmButtonText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* You might need a global style for body.modal-open-custom if not already defined */}
      {/* <style jsx global>{`
        body.modal-open-custom {
          overflow: hidden;
        }
        .modal-backdrop-blur { // If not globally defined
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.4);
            -webkit-backdrop-filter: blur(4px);
            backdrop-filter: blur(4px);
        }
      `}</style> */}
    </>
  );
}
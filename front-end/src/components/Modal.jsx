import { useEffect } from 'react';

/**
 * Reusable Modal Component
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal content
 */
export function Modal({ isOpen, onClose, title, children }) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md mx-4 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-yellow-500">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

/**
 * Confirmation Modal with actions
 */
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', isLoading = false }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p className="text-slate-300 mb-6">{message}</p>
            <div className="flex gap-4">
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="flex-1 py-2 px-4 bg-yellow-600 hover:bg-yellow-500 text-black rounded-lg font-semibold transition disabled:opacity-50"
                >
                    {isLoading ? 'Processing...' : confirmText}
                </button>
            </div>
        </Modal>
    );
}

export default Modal;

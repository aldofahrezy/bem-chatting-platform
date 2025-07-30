"use client";

import React from 'react';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void; // Untuk menutup dialog tanpa aksi
  onConfirm?: () => void; // Untuk aksi konfirmasi positif
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirmDestructive?: boolean; // Jika tombol konfirmasi berwarna merah (bahaya)
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "OK",
  cancelText = "Batal",
  isConfirmDestructive = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-700 text-sm">{message}</p>
        <div className="flex justify-end space-x-3">
          {onConfirm && ( // Tampilkan tombol Batal hanya jika ada aksi konfirmasi
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
              isConfirmDestructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
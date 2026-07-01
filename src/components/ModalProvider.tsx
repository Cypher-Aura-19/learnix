'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ModalType = 'info' | 'success' | 'warning' | 'error';

export interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
}

export interface ConfirmOptions extends ModalOptions {
  confirmText?: string;
  cancelText?: string;
}

interface ModalContextProps {
  showAlert: (options: ModalOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within a ModalProvider");
  return context;
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    isConfirm: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showAlert = (options: ModalOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { title: 'Alert', message: options } : options;
      setModalState({
        isOpen: true,
        isConfirm: false,
        options: { ...opts, type: opts.type || 'info' },
        resolve: (val) => resolve(),
      });
    });
  };

  const showConfirm = (options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { title: 'Confirm', message: options } : options;
      setModalState({
        isOpen: true,
        isConfirm: true,
        options: { ...opts, type: opts.type || 'warning' },
        resolve,
      });
    });
  };

  const handleClose = (value: boolean) => {
    if (modalState) {
      modalState.resolve(value);
      setModalState(null);
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modalState?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border-[3px] border-black p-6 shadow-[8px_8px_0px_#000] rounded-none flex flex-col relative" style={{ animation: 'slideUp 0.2s ease-out' }}>
            <button 
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 text-black hover:text-neutral-600 transition-colors focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-12 h-12 shrink-0 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] ${
                modalState.options.type === 'success' ? 'bg-[#00ea8c] text-white' :
                modalState.options.type === 'error' ? 'bg-[#ff4d4d] text-white' :
                modalState.options.type === 'warning' ? 'bg-[#ffcc00] text-black' :
                'bg-[#00a8ff] text-white'
              }`}>
                {modalState.options.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> :
                 modalState.options.type === 'error' ? <AlertCircle className="w-6 h-6" /> :
                 modalState.options.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> :
                 <Info className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="font-heading text-lg font-black uppercase text-black leading-tight mb-2 pr-6">
                  {modalState.options.title}
                </h3>
                <p className="font-sans text-sm font-bold text-neutral-600 leading-relaxed whitespace-pre-wrap">
                  {modalState.options.message}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-4 mt-2">
              {modalState.isConfirm && (
                <button
                  onClick={() => handleClose(false)}
                  className="px-6 py-2.5 border-2 border-black bg-white hover:bg-neutral-100 font-sans font-extrabold text-xs uppercase tracking-wider text-black shadow-[2.5px_2.5px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
                >
                  {modalState.options.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={() => handleClose(true)}
                className={`px-6 py-2.5 border-2 border-black font-sans font-extrabold text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer ${
                  modalState.options.type === 'error' 
                    ? 'bg-[#ff4d4d] text-white hover:bg-[#ff4d4d]/90' 
                    : modalState.options.type === 'warning'
                    ? 'bg-[#ffcc00] text-black hover:bg-[#ffcc00]/90'
                    : 'bg-[#00ea8c] text-black hover:bg-[#00ea8c]/90'
                }`}
              >
                {modalState.options.confirmText || 'Okay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

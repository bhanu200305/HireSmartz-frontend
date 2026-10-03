'use client';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

// Errors get longer on screen than success/info/warning — they tend to
// carry a longer, more specific message (a backend validation reason, say)
// that needs more time to actually read, not just notice.
const AUTO_CLOSE_MS: Record<Required<ToastProps>['type'], number> = {
  success: 3000,
  info: 3000,
  warning: 3000,
  error: 6000,
};

export const showToast = ({ message, type = 'error' }: ToastProps) => {
  toast[type](message, {
    position: 'top-right',
    autoClose: AUTO_CLOSE_MS[type],
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  });
};

export default showToast;

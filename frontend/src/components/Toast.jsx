// This file is optional because we use react-hot-toast directly.
// However, if you want a custom wrapper:

import toast from 'react-hot-toast';

export const showToast = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.error(msg),
  info: (msg) => toast(msg),
  loading: (msg) => toast.loading(msg),
  dismiss: (toastId) => toast.dismiss(toastId),
};

// You can also create a custom component if needed:
export default function ToastContainer() {
  return null; // react-hot-toast already provides its own container
}
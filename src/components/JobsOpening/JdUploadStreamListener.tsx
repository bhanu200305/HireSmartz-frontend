import { useSelector } from 'react-redux';
import useJdUploadStream from '../../hooks/useJdUploadStream';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { RootState } from '../../redux/provider/store';
import { showToast } from '../shared';

const JD_UPLOAD_BATCH_STORAGE_KEY = 'cfp_jd_upload_batch_id';

interface JdUploadProgressData {
  batchId?: string;
  status?: string;
  filesProcessed?: number;
  totalFiles?: number;
  progress?: number;
  currentFile?: string;
  message?: string;
}

interface JdUploadNotificationData {
  type?: string;
  title?: string;
  message?: string;
  severity?: 'success' | 'warning' | 'error' | 'info';
  jobOpeningId?: number;
  jobTitle?: string;
}

/**
 * Listens to JD Upload progress and notification streams
 * Mounted in components that handle JD uploads (e.g., JobsOpening pages)
 * Persists batch ID in sessionStorage to resume streams across page navigations
 */
const JdUploadStreamListener = () => {
  // Get auth token from Redux or localStorage
  const loginToken = useSelector((state: RootState) => state.LoginSlice.loginToken);
  const token = loginToken || getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);

  // Get batch ID from sessionStorage to resume in-flight uploads
  const batchId = sessionStorage.getItem(JD_UPLOAD_BATCH_STORAGE_KEY);

  const handleProgress = (data: JdUploadProgressData) => {
    console.log('JD Upload Progress:', data);

    // Store batch ID for recovery across navigations
    if (data.batchId) {
      sessionStorage.setItem(JD_UPLOAD_BATCH_STORAGE_KEY, data.batchId);
    }

    // Show progress notifications for milestone updates
    if (data.status === 'PROCESSING') {
      if (data.currentFile) {
        showToast({
          message: `Processing: ${data.currentFile} (${data.filesProcessed}/${data.totalFiles})`,
          type: 'info',
        });
      }
    }
  };

  const handleNotification = (data: JdUploadNotificationData) => {
    console.log('JD Upload Notification:', data);

    const toastType = data.severity || 'info';
    const message = data.message || data.title || 'JD Upload notification';

    showToast({
      message,
      type: toastType as 'success' | 'error' | 'info',
    });
  };

  const handleComplete = (data: JdUploadProgressData) => {
    console.log('JD Upload Completed:', data);

    // Clear batch ID from sessionStorage on completion
    sessionStorage.removeItem(JD_UPLOAD_BATCH_STORAGE_KEY);

    showToast({
      message: data.message || 'JD upload completed successfully',
      type: 'success',
    });

    // Trigger any necessary data refresh (e.g., refetch job data)
    // Dispatch events or mutations as needed
  };

  const handleError = (error: Error) => {
    console.error('JD Upload Stream Error:', error);

    showToast({
      message: error.message || 'An error occurred during JD upload streaming',
      type: 'error',
    });
  };

  // Start listening to streams when batch ID is available
  useJdUploadStream({
    batchId,
    token,
    onProgress: handleProgress,
    onNotification: handleNotification,
    onComplete: handleComplete,
    onError: handleError,
  });

  return null;
};

export default JdUploadStreamListener;

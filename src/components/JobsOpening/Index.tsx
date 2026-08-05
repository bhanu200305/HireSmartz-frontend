import { Button, Search, CommonCard, Typography } from '..';
import {
  DownOutlined,
  CloseOutlined,
  MoreOutlined,
  PlusOutlined,
  QrcodeOutlined,
  SettingOutlined,
  UploadOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader } from '../shared/ui/loader';
import MainLayout from '../../layouts/MainLayout';
import { TbBriefcase2 } from 'react-icons/tb';
import { AiFillStar } from 'react-icons/ai';
import { hasFeatureAccess } from '../../shared/utils/auth/getAccess';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import { useState, useEffect, useRef } from 'react';
import { useGetJobOpeningsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import { useGetMyLocationsQuery } from '../../api/job-service/JobOpening/GetJobLocations';
import MasterPagination from '../shared/ui/MasterPagination';
import { setJobOpeningFilters } from '../../redux/slices/jobOpeningFilterSlice';
import { Col, Dropdown, Modal, Row, Select, MenuProps, Tooltip } from 'antd';
import { MdOutlineFilterAlt } from 'react-icons/md';
import { DateTimePayload, Jobs, SortDirection } from '../../types';
import DateTimeRangePicker from '../shared/ui/datePicker';
import {
  generateJobProfileCode,
  handleDateValue,
  safeDecodeToken,
} from '../../shared/utils/methods';
import { COL } from '../shared/ui/Columns';
import {
  useDuplicateJobOpeningMutation,
  useGetJobOpeningByIdQuery,
} from '../../api/job-service/JobOpening/GetJobOpeningById';
import { showToast } from '../shared';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import { useCheckAtsCalStatusMutation } from '../../api/job-service/JobOpening/CheckStatusForAtsAndCal';
import CloseJobModal from './Candidates/Modal/CloseJobModal';
import { buildInternalGlobalSearchRequestDto } from '../../shared/utils/filters/internalSearchPayload';
import JobListingNotesPanel from './Notes/JobListingNotesPanel';
import { QrCodeCard } from '../shared/ui/QrCodeCard';
import {
  useGetQrListQuery,
  useGenerateQrMutation,
  useToggleQrActiveMutation,
} from '../../api/tenant-service/MyCompany/qrCode';
import { resetJobState } from '../../redux/slices/jobOpeningSlice';
import {
  useUploadBulkJdMutation,
  useUploadSingleJdMutation,
} from '../../api/job-service/JobOpening/JdUpload';
import useEventSource from '../../hooks/useEventSource';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';

const { Option } = Select;

const MAX_JD_FILES = 30;
const MAX_JD_FILE_SIZE_MB = 5;
const ALLOWED_JD_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_JD_EXTENSIONS = ['.pdf', '.docx'];

// HighlightText Component
interface HighlightTextProps {
  text: string;
  highlights: string[];
  highlightClassName?: string;
}

const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  highlights,
  highlightClassName = 'bg-yellow-300',
}) => {
  if (!highlights.length) {
    return <span>{text}</span>;
  }

  const escapedHighlights = highlights
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);

  const regex = new RegExp(`(${escapedHighlights.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts
        .filter((part) => part)
        .map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className={highlightClassName}>
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
    </span>
  );
};

const JobsOpening = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [jobToDuplicate, setJobToDuplicate] = useState<number | null>(null);
  const [isFromGlobalSearch, setIsFromGlobalSearch] = useState(false);
  const [globalSearchBaseQuery, setGlobalSearchBaseQuery] = useState('');
  const [globalSearchField, setGlobalSearchField] = useState('');
  const { role, authorities } = useSelector((state: any) => state.LoginSlice, shallowEqual);
  const [collapsedUsers, setCollapsedUsers] = useState<string[]>([]);
  const [duplicateJobOpening, { isLoading: isDuplicating }] = useDuplicateJobOpeningMutation();
  const { loginToken } = useSelector((state: any) => state.LoginSlice);
  const [checkAtsCalStatus, { isLoading: isCheckingStatus }] = useCheckAtsCalStatusMutation();
  const [showCloseJobModal, setShowCloseJobModal] = useState(false);
  const [jobName, setJobName] = useState<string | null>(null);
  const [jobOpeningId, setJobOpeningId] = useState<number | null>(null);
  const [interviewCount, setInterviewCount] = useState({
    selectedCount: 0,
    bookingCreatedCount: 0,
    inProgressCount: 0,
    invitationSentCount: 0,
  });
  const [jobNotesFor, setJobNotesFor] = useState<{ id: number; title: string } | null>(null);

  const decodedToken = safeDecodeToken<{ companyName: string; companyId?: number }>(loginToken);
  const companyId = decodedToken?.companyId ?? 0;
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState<boolean>(false);
  const [showJdUploadModal, setShowJdUploadModal] = useState<boolean>(false);
  const [jdFiles, setJdFiles] = useState<File[]>([]);
  const [uploadedJobOpeningId, setUploadedJobOpeningId] = useState<number | null>(null);
  const [jdBatchId, setJdBatchId] = useState<string | null>(null);
  const [jdProgress, setJdProgress] = useState<number>(0);
  const [jdProgressMessage, setJdProgressMessage] = useState<string>('');
  const [jdUploadError, setJdUploadError] = useState<string>('');
  const [isJdUploading, setIsJdUploading] = useState<boolean>(false);
  const [isJdCompleted, setIsJdCompleted] = useState<boolean>(false);
  const [isJdPartialFailure, setIsJdPartialFailure] = useState<boolean>(false);
  const [isJdFailed, setIsJdFailed] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data: qrListData, isLoading: isQrLoading } = useGetQrListQuery(
    { companyId, status: 'all' },
    { skip: !companyId || !qrModalOpen }
  );
  const [generateQr, { isLoading: isGenerating }] = useGenerateQrMutation();
  const [toggleQrActive, { isLoading: isTogglingActive }] = useToggleQrActiveMutation();
  const [uploadSingleJd] = useUploadSingleJdMutation();
  const [uploadBulkJd] = useUploadBulkJdMutation();
  const streamToken = loginToken || getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || undefined;

  const extractBatchId = (response: unknown): string | null => {
    const toBatchId = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;

      if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? String(value) : null;
      }

      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        return trimmedValue.length > 0 ? trimmedValue : null;
      }

      return null;
    };

    if (!response || typeof response !== 'object') {
      return null;
    }

    const payload = response as {
      batchId?: number | string;
      data?: {
        batchId?: number | string;
        id?: number | string;
        batch?: {
          id?: number | string;
          batchId?: number | string;
        };
      };
    };

    const candidate =
      payload?.data?.batchId ??
      payload?.batchId ??
      payload?.data?.id ??
      payload?.data?.batch?.batchId ??
      payload?.data?.batch?.id;

    return toBatchId(candidate);
  };

  const masterQr = qrListData?.data?.find((qr) => qr.masterQr) ?? null;

  const handleQrGenerate = async (): Promise<void> => {
    try {
      const result = await generateQr({ companyId }).unwrap();
      showToast({ type: 'success', message: result.message || 'QR code generated successfully.' });
    } catch {
      showToast({ type: 'error', message: 'Failed to generate QR code. Please try again.' });
    }
  };

  const handleQrToggleActive = async (active: boolean): Promise<void> => {
    if (!masterQr) return;
    try {
      const result = await toggleQrActive({ qrId: masterQr.id, active }).unwrap();
      showToast({
        type: 'success',
        message: result.message || `QR code ${active ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch {
      showToast({ type: 'error', message: 'Failed to update QR code status. Please try again.' });
    }
  };

  const filters = useSelector((state: RootState) => state.JobOpeningFiltersSlice);
  const globalSearchQuery = useSelector((state: RootState) => state.globalSearchSlice.query);
  const persistedGlobalSearchField = useSelector(
    (state: RootState) => state.globalSearchSlice.selectedCategoryField
  );
  const { data, isLoading, error, refetch } = useGetJobOpeningsQuery(filters, {
    refetchOnMountOrArgChange: true,
  });

  const { data: locationsData, refetch: refetchLocations } = useGetMyLocationsQuery({
    activeOnly: false,
  });
  const locations = locationsData?.data || [];

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({
    key: filters.sortBy || '',
    direction: (filters.sortDir as SortDirection) || null,
  });

  useEffect(() => {
    const state = location.state as any;

    if (state?.fromGlobalSearch && state?.resetFilters) {
      const baseQuery = state.searchQuery || '';
      const baseField = state.searchField || persistedGlobalSearchField || '';
      setIsFromGlobalSearch(true);
      setGlobalSearchBaseQuery(baseQuery);
      setGlobalSearchField(baseField);

      dispatch(
        setJobOpeningFilters({
          text: filters.text || '',
          searchQuery: filters.searchQuery || '',
          globalSearchRequestDto: buildInternalGlobalSearchRequestDto(baseQuery, baseField),
          page: 0,
          status: undefined,
          isDraft: undefined,
          isClosed: undefined,
          isAll: true,
          locationId: undefined,
          startDateTime: '',
          endDateTime: '',
          sortBy: undefined,
          sortDir: undefined,
        })
      );
      refetchLocations();

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state, dispatch, persistedGlobalSearchField]);

  useEffect(() => {
    const internalTerm = filters.text?.trim();
    const globalTerm = filters.globalSearchRequestDto?.text?.trim();

    if (globalTerm && data?.data) {
      setCollapsedUsers(data.data.map((job) => job.jobOpeningId.toString()));
    } else if (internalTerm && data?.data) {
      const matchingJobIds = data.data
        .filter((job) => {
          const searchTerm = internalTerm.toLowerCase();
          return (
            job.jobProfileCode?.toLowerCase().includes(searchTerm) ||
            job.departmentName?.toLowerCase().includes(searchTerm) ||
            job.jobTypeName?.toLowerCase().includes(searchTerm) ||
            job.openings?.toString().includes(searchTerm)
          );
        })
        .map((job) => job.jobOpeningId.toString());

      setCollapsedUsers((prev) => {
        const updated = new Set(prev);
        const allJobIds = new Set(data.data.map((job) => job.jobOpeningId.toString()));

        matchingJobIds.forEach((id) => updated.add(id));
        allJobIds.forEach((id) => {
          if (!matchingJobIds.includes(id)) {
            updated.delete(id);
          }
        });

        return Array.from(updated);
      });
    } else {
      setCollapsedUsers([]);
    }
    refetchLocations();
  }, [filters.text, filters.globalSearchRequestDto?.text, data?.data]);

  useEventSource({
    type: 'batch',
    restUrl: jdBatchId ? `/job-opening/jd-upload/batch/${jdBatchId}/progress` : '',
    token: streamToken,
    onMessage: (payload: unknown) => {
      if (!payload || typeof payload !== 'object') {
        return;
      }

      const eventData = payload as {
        status?: string;
        message?: string;
        detail?: string;
        processed?: number;
        total?: number;
        currentFile?: string | null;
        progress?: number;
        percentage?: number;
        progressPercentage?: number;
        eventName?: string;
      };

      const processedCount = Number(eventData.processed);
      const totalCount = Number(eventData.total);
      const hasStepProgress =
        Number.isFinite(processedCount) && Number.isFinite(totalCount) && totalCount > 0;

      const rawProgress = hasStepProgress
        ? (processedCount / totalCount) * 100
        : (eventData.progressPercentage ?? eventData.progress ?? eventData.percentage ?? 0);
      const normalizedProgress = Number(rawProgress);

      if (Number.isFinite(normalizedProgress)) {
        const safeProgress = Math.max(0, Math.min(100, normalizedProgress));
        setJdProgress(safeProgress);
      }

      if (eventData.currentFile && String(eventData.currentFile).trim()) {
        setJdProgressMessage(`Processing ${eventData.currentFile}...`);
      } else if (eventData.detail) {
        setJdProgressMessage(eventData.detail);
      } else if (eventData.message) {
        setJdProgressMessage(eventData.message);
      }

      const status = String(eventData.status || eventData.eventName || '').toUpperCase();
      const isCompletedStatus = status.includes('BATCH_COMPLETED') || status === 'COMPLETED';

      if (!isCompletedStatus) {
        return;
      }

      const summaryText = 'Batch completed. Please review uploaded jobs.';

      setIsJdUploading(false);
      setIsJdCompleted(true);
      setJdBatchId(null);
      setJdProgress(100);
      setJdProgressMessage(summaryText);

      setIsJdPartialFailure(false);
      setIsJdFailed(false);
      showToast({
        type: 'success',
        message: 'JD uploaded successfully.',
      });
      refetch();
    },
    onAbort: () => {
      setJdBatchId(null);
    },
  });

  useEffect(() => {
    const hasPersistedGlobalSearch = Boolean(filters.globalSearchRequestDto?.text?.trim());

    if (globalSearchQuery.trim()) {
      return;
    }

    if (!isFromGlobalSearch && !hasPersistedGlobalSearch) {
      return;
    }

    setIsFromGlobalSearch(false);
    setGlobalSearchBaseQuery('');
    setGlobalSearchField('');

    dispatch(
      setJobOpeningFilters({
        globalSearchRequestDto: undefined,
        page: 0,
      })
    );

    refetchLocations();
    refetch();
  }, [
    globalSearchQuery,
    isFromGlobalSearch,
    filters.globalSearchRequestDto?.text,
    dispatch,
    refetch,
    refetchLocations,
  ]);

  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key, direction });
    dispatch(
      setJobOpeningFilters({
        sortBy: direction ? key : undefined,
        sortDir: direction || undefined,
        page: 0,
      })
    );
  };
  const currentSortKey = sortConfig.direction
    ? `${sortConfig.direction === 'desc' ? '-' : ''}${sortConfig.key}`
    : undefined;

  const toggleCollapse = (key: string) => {
    setCollapsedUsers((prev) =>
      prev.includes(key) ? prev.filter((jobOpeningId) => jobOpeningId !== key) : [...prev, key]
    );
  };

  const handlePageChange = (page: number) => {
    dispatch(setJobOpeningFilters({ page }));
  };

  const handleSearch = (query: string) => {
    dispatch(
      setJobOpeningFilters({
        text: query,
        searchQuery: query,
        page: 0,
      })
    );
  };

  const handleDateTimeChange = (range: DateTimePayload) => {
    dispatch(setJobOpeningFilters(range));
  };

  const handleReset = () => {
    dispatch(
      setJobOpeningFilters({
        startDateTime: '',
        endDateTime: '',
      })
    );
  };

  const handleStatusChange = (value: string) => {
    if (value === 'ACTIVE') {
      dispatch(
        setJobOpeningFilters({
          status: true,
          isDraft: undefined,
          isClosed: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'INACTIVE') {
      dispatch(
        setJobOpeningFilters({
          status: false,
          isDraft: undefined,
          isClosed: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'Draft') {
      dispatch(
        setJobOpeningFilters({
          status: undefined,
          isDraft: true,
          isClosed: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'Closed') {
      dispatch(
        setJobOpeningFilters({
          isClosed: true,
          isDraft: undefined,
          status: undefined,
          isAll: undefined,
          page: 0,
        })
      );
    } else if (value === 'All') {
      dispatch(
        setJobOpeningFilters({
          isAll: true,
          isClosed: undefined,
          isDraft: undefined,
          status: undefined,
          page: 0,
        })
      );
    } else {
      dispatch(
        setJobOpeningFilters({
          status: undefined,
          isDraft: undefined,
          isClosed: undefined,
          isAll: true,
          page: 0,
        })
      );
    }
  };

  const handleLocationChange = (value: number | undefined) => {
    dispatch(
      setJobOpeningFilters({
        locationId: value,
        page: 0,
      })
    );
  };

  const generateJobProfileCodeHelper = () => {
    const companyName = decodedToken?.companyName || '';

    let initials = 'CFP';
    if (companyName.length >= 3) {
      initials = companyName.slice(0, 3).toUpperCase();
    } else if (companyName.length === 2) {
      initials = companyName.slice(0, 2).toUpperCase();
    } else if (companyName.length === 1) {
      initials = companyName.slice(0, 1).toUpperCase();
    }

    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${initials}-${randomPart}`;
  };

  const handleDuplicate = () => {
    if (!jobToDuplicate) return;

    const jobProfileCode = generateJobProfileCodeHelper();

    duplicateJobOpening({
      jobOpeningId: jobToDuplicate,
      jobProfileCode,
    })
      .unwrap()
      .then((res) => {
        if (res?.status === 'OK' || res?.status === true) {
          showToast({
            message: res?.message || 'Job duplicated successfully',
            type: 'success',
          });
          if (filters.page > 0) {
            dispatch(
              setJobOpeningFilters({
                page: 0,
              })
            );
          } else {
            refetch();
          }
          window.scrollTo(0, 0);
        } else {
          showToast({
            message: res?.message || 'Failed to duplicate job opening',
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: err?.data?.message || 'Something went wrong while duplicating the job opening',
          type: 'error',
        });
      })
      .finally(() => {
        setShowDuplicateModal(false);
        setJobToDuplicate(null);
      });
  };

  const handleCreateNewJob = async () => {
    try {
      const response = await checkAtsCalStatus().unwrap();

      if (response.success) {
        setShowCreateJobModal(true);
      } else {
        showToast({
          message: response.message || 'Configuration check failed',
          type: 'error',
        });
      }
    } catch (error: any) {
      showToast({
        message: error.data?.message || 'Failed to check system configuration',
        type: 'error',
      });
    }
  };

  const handleJobConfiguration = () => {
    navigate('/job-fields-configuration');
  };

  const resetJdUploadState = () => {
    setJdFiles([]);
    setUploadedJobOpeningId(null);
    setJdBatchId(null);
    setJdProgress(0);
    setJdProgressMessage('');
    setJdUploadError('');
    setIsJdUploading(false);
    setIsJdCompleted(false);
    setIsJdPartialFailure(false);
    setIsJdFailed(false);
  };

  const isValidJdFile = (file: File): boolean => {
    const mimeType = file.type;
    const lowerName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_JD_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    return ALLOWED_JD_MIME_TYPES.includes(mimeType) || hasValidExtension;
  };

  const processJdUpload = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) {
      return;
    }

    setIsJdUploading(true);
    setIsJdCompleted(false);
    setIsJdPartialFailure(false);
    setIsJdFailed(false);
    setJdUploadError('');
    setJdProgress(10);
    setJdProgressMessage('Uploading file(s)...');

    try {
      const response =
        filesToUpload.length > 1
          ? await uploadBulkJd(filesToUpload).unwrap()
          : await uploadSingleJd(filesToUpload[0]).unwrap();

      const responseBatchId = extractBatchId(response);
      console.log('JD Upload Response:', response, 'Extracted Batch ID:', responseBatchId);

      if (responseBatchId) {
        setJdBatchId(responseBatchId);
        setJdProgress((prev) => Math.max(prev, 20));
        setJdProgressMessage('Upload successful. Processing has started...');
        return;
      }

      if (filesToUpload.length === 1 && response?.data?.jobOpeningId) {
        setUploadedJobOpeningId(response.data.jobOpeningId);
      }

      setIsJdUploading(false);
      setIsJdCompleted(true);
      setJdProgress(100);
      setJdProgressMessage(response?.message || 'Upload completed successfully.');
      refetch();
    } catch (error) {
      const uploadError = error as { data?: { message?: string } };
      setIsJdUploading(false);
      setIsJdFailed(true);
      setJdUploadError(uploadError?.data?.message || 'Failed to upload JD file(s).');
      showToast({
        type: 'error',
        message: uploadError?.data?.message || 'Failed to upload JD file(s).',
      });
    }
  };

  const handleJdFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.length > MAX_JD_FILES) {
      showToast({
        type: 'error',
        message: `You can upload a maximum of ${MAX_JD_FILES} files.`,
      });
      return;
    }

    const invalidTypeFiles = selectedFiles.filter((file) => !isValidJdFile(file));
    if (invalidTypeFiles.length > 0) {
      showToast({
        type: 'error',
        message: `Invalid file type detected. Supported formats: ${ALLOWED_JD_EXTENSIONS.join(', ')}.`,
      });
      return;
    }

    const oversizedFiles = selectedFiles.filter(
      (file) => file.size / 1024 / 1024 > MAX_JD_FILE_SIZE_MB
    );
    if (oversizedFiles.length > 0) {
      showToast({
        type: 'error',
        message: `File size must not exceed ${MAX_JD_FILE_SIZE_MB} MB.`,
      });
      return;
    }

    setShowCreateJobModal(false);
    setShowJdUploadModal(true);
    setJdFiles(selectedFiles);
    await processJdUpload(selectedFiles);
  };

  const handleGoToDraftJobs = () => {
    dispatch(
      setJobOpeningFilters({
        text: '',
        searchQuery: '',
        status: undefined,
        isDraft: true,
        isClosed: undefined,
        isAll: undefined,
        page: 0,
      })
    );

    resetJdUploadState();
    setShowJdUploadModal(false);
    setShowCreateJobModal(false);
    navigate('/jobs');
    refetch();
  };

  const getHighlightTerms = (): string[] => {
    const internalQuery = filters.text?.trim() || '';
    const globalQuery = filters.globalSearchRequestDto?.text?.trim() || '';

    return Array.from(new Set([globalQuery, internalQuery].filter(Boolean)));
  };

  const renderHighlightedField = (text: string, _fieldName: string) => {
    const highlightTerms = getHighlightTerms();

    if (!highlightTerms.length) {
      return <span>{text}</span>;
    }

    return (
      <HighlightText
        text={text || ''}
        highlights={highlightTerms}
        highlightClassName="bg-yellow-300 text-black px-0.5 rounded"
      />
    );
  };

  const renderActions = (record: Jobs) => {
    const items = [
      !record.isDraft && {
        key: 'view',
        label: 'View',
        onClick: () => navigate(`/jobs/view/${record.jobOpeningId}/details`),
      },
      {
        key: 'notes',
        label: 'Add notes',
        onClick: () =>
          setJobNotesFor({
            id: record.jobOpeningId,
            title: record.jobTitleName ?? '',
          }),
      },
      !record.isClosed && {
        key: 'edit',
        label: 'Edit',
        onClick: () =>
          navigate(`/jobs/edit/${record.jobOpeningId}/details`, {
            state: {
              interviewedCandidateCount: record?.interviewedCandidateCount ?? 0,
            },
          }),
      },
      !record.isDraft && {
        key: 'duplicate',
        label: 'Duplicate',
        onClick: () => {
          setJobToDuplicate(record.jobOpeningId);
          setShowDuplicateModal(true);
        },
      },
      !record.isClosed &&
        !record?.isDraft && {
          key: 'close',
          label: 'Close Job',
          onClick: () => {
            setJobName(record?.jobTitleName);
            setJobOpeningId(record.jobOpeningId);
            setShowCloseJobModal(true);
            setInterviewCount({
              selectedCount: record.selectedCount,
              bookingCreatedCount: record.bookingCreatedCount,
              inProgressCount: record.inProgressCount,
              invitationSentCount: record.invitationSentCount,
            });
          },
        },
    ].filter((item) => {
      if (!item) return false;
      if (item.key === 'notes') {
        return hasFeatureAccess('job_opening', 'view', role);
      }
      if (hasFeatureAccess('job_opening', item.key as any, role)) return true;
      return false;
    });

    return (
      <Dropdown
        menu={{
          items: items as MenuProps['items'],
        }}
        trigger={['click']}
      >
        <MoreOutlined
          style={{ cursor: 'pointer', fontSize: '20px' }}
          onClick={(e) => e.stopPropagation()}
        />
      </Dropdown>
    );
  };

  return (
    <div>
      <MainLayout>
        <div className="w-full p-8 justify-start pt-16">
          {(isLoading || isDuplicating) && <Loader />}
          <div className="flex space-x-4 justify-between p-2">
            {isFromGlobalSearch && filters.text ? (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                    <TbBriefcase2 size={18} />
                  </span>
                  <h2 className="text-xl font-semibold">Showing Results</h2>
                </div>
                <span className="text-gray-500 text-sm">for "{filters.text}"</span>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                    <TbBriefcase2 size={18} />
                  </span>
                  <h2 className="text-xl font-semibold">Job Openings</h2>
                </div>
              </div>
            )}
            <div className="flex space-x-4 items-center">
              {hasFeatureAccess('job_configuration', 'view', role, authorities) && (
                <Tooltip title="Job Configuration" placement="top">
                  <Button
                    onClick={handleJobConfiguration}
                    className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-full h-10 w-10"
                  >
                    <SettingOutlined className="text-2xl" />
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="QR Management" placement="top">
                <Button
                  onClick={() => setQrModalOpen(true)}
                  className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-full h-10 w-10"
                >
                  <QrcodeOutlined className="text-2xl" />
                </Button>
              </Tooltip>
              <Search
                appname="jobs opening"
                placeholder="Search job..."
                onSearch={handleSearch}
                allowClear
                value={filters.text || ''}
              />
              <DateTimeRangePicker
                value={handleDateValue(filters)}
                onApply={handleDateTimeChange}
                onReset={handleReset}
              />
              <div className="border border-[var(--border)] p-1 rounded-3xl w-40 max-h-12 flex items-center">
                <Select
                  placeholder="Status"
                  prefix={<MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />}
                  onChange={handleStatusChange}
                  allowClear
                  className="w-full custom-select"
                  popupClassName="rounded-3xl"
                  value={
                    filters.isDraft
                      ? 'Draft'
                      : filters.isClosed
                        ? 'Closed'
                        : filters.isAll
                          ? 'All'
                          : filters.status === true
                            ? 'ACTIVE'
                            : filters.status === false
                              ? 'INACTIVE'
                              : undefined
                  }
                >
                  <Option value="All">All</Option>
                  <Option value="ACTIVE">Active</Option>
                  <Option value="Draft">Draft</Option>
                  <Option value="Closed">Closed</Option>
                </Select>
              </div>
              <div className="border border-[var(--border)] p-1 rounded-3xl w-40 max-h-12 flex items-center">
                <Select
                  placeholder="All Locations"
                  prefix={<MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />}
                  onChange={handleLocationChange}
                  allowClear
                  className="w-full custom-select"
                  popupClassName="rounded-3xl"
                  value={filters.locationId}
                >
                  {locations.map((loc) => (
                    <Option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.primary && (
                        <AiFillStar
                          className="ml-1 inline-block flex-shrink-0 text-amber-400"
                          title="Primary Location"
                        />
                      )}
                    </Option>
                  ))}
                </Select>
              </div>
              {hasFeatureAccess('job_opening', 'create', role, authorities) && (
                <Button
                  appname="add Job Description"
                  className="w-100% text-white bg-button rounded-3xl px-3 py-2 flex items-center"
                  onClick={handleCreateNewJob}
                >
                  <PlusOutlined className="text-sm pr-2" />{' '}
                  <span className="text-sm whitespace-nowrap">ADD JOB OPENING</span>
                </Button>
              )}
            </div>
          </div>
          <div className="w-full p-2 justify-start">
            <Row
              gutter={[16, 16]}
              className="font-bold py-2 px-2 bg-[#FAFAFA] border border-[var(--border)] heading-font"
            >
              <COL
                sortable
                sortKey="jobTitleName"
                currentSortKey={currentSortKey}
                onSort={handleSort}
                span={5}
                className="px-4 py-2 border-[var(--border)] "
              >
                JOB TITLE
              </COL>
              <COL
                sortable
                sortKey="locationName"
                currentSortKey={currentSortKey}
                onSort={handleSort}
                span={4}
                className="px-4 py-2 border-[var(--border)]"
              >
                LOCATION
              </COL>
              <COL
                sortable
                sortKey="candidateCount"
                currentSortKey={currentSortKey}
                onSort={handleSort}
                span={3}
                className="px-4 py-2 border-[var(--border)]"
              >
                CANDIDATES
              </COL>
              <Col span={3} className="px-4 py-2">
                INTERVIEWED
              </Col>
              <Col span={3} className="px-4 py-2">
                SELECTED
              </Col>
              <Col span={4} className="px-4 py-2">
                NOT SELECTED
              </Col>
              <Col span={2} className="px-4 py-2  border-[var(--border)]">
                ACTIONS
              </Col>
            </Row>
          </div>
          <div className="w-full">
            {data?.data.map((jobs) => (
              <div key={jobs.jobOpeningId} className="mb-2">
                <CommonCard>
                  <Row gutter={[16, 16]} align="middle">
                    <Col span={5}>
                      <div className="flex items-center">
                        <Link
                          to={`/jobs/view/${jobs.jobOpeningId}/candidates?page=1&size=10`}
                          className="font-semibold text-primary underline hover:text-primary roboto-font"
                        >
                          <span className="text-primary capitalize">
                            {renderHighlightedField(jobs.jobTitleName, 'jobTitleName')}
                          </span>
                        </Link>
                        <span
                          className="ml-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(jobs.jobOpeningId.toString());
                          }}
                        >
                          {collapsedUsers.includes(jobs.jobOpeningId.toString()) ? (
                            <UpOutlined />
                          ) : (
                            <DownOutlined />
                          )}
                        </span>
                      </div>
                      {collapsedUsers.includes(jobs.jobOpeningId.toString()) && (
                        <div className="mt-1">
                          <p className="inline-flex items-center gap-1">
                            <span className="font-medium roboto-font">Job ID: </span>{' '}
                            <span className="roboto-font">
                              {renderHighlightedField(jobs.jobProfileCode, 'jobProfileCode')}
                            </span>
                          </p>
                          <p>
                            <span className="font-medium roboto-font">Department: </span>{' '}
                            <span className="roboto-font">
                              {renderHighlightedField(jobs.departmentName, 'departmentName')}
                            </span>
                          </p>
                          <p>
                            <span className="font-medium roboto-font">Job Type: </span>{' '}
                            <span className="roboto-font">
                              {renderHighlightedField(jobs.jobTypeName, 'jobTypeName')}
                            </span>
                          </p>
                          <p>
                            <span className="font-medium roboto-font">Job Openings: </span>{' '}
                            <span className="roboto-font">
                              {renderHighlightedField(jobs.openings?.toString(), 'openings')}
                            </span>
                          </p>
                        </div>
                      )}
                    </Col>
                    <Col span={4}>
                      <span className="roboto-font">
                        {renderHighlightedField(jobs.location?.name ?? '-', 'location.name')}
                      </span>
                    </Col>

                    <Col span={3}>
                      <div className="flex items-center gap-4">
                        <Link
                          to={`/jobs/view/${jobs.jobOpeningId}/candidates?page=1&size=10`}
                          className="text-primary hover:underline roboto-font"
                        >
                          <span className="text-primary font-semibold">
                            {renderHighlightedField(
                              jobs.candidateCount?.toString(),
                              'candidateCount'
                            )}
                          </span>
                        </Link>
                        {(jobs.newCandidateCount ?? 0) > 0 && (
                          <Link
                            to={`/jobs/view/${jobs.jobOpeningId}/candidates?page=1&size=10&isNew=true`}
                            className="text-xs font-semibold text-blue-500 border border-blue-500 rounded-full px-2 py-0.5 hover:bg-blue-50 whitespace-nowrap"
                          >
                            {jobs.newCandidateCount} New
                          </Link>
                        )}
                      </div>
                    </Col>
                    <Col span={3}>
                      <p className="roboto-font">
                        {renderHighlightedField(
                          jobs.interviewedCandidateCount?.toString(),
                          'interviewedCandidateCount'
                        )}
                      </p>
                    </Col>
                    <Col span={3}>
                      <p className="roboto-font">
                        {renderHighlightedField(jobs?.selectedCount?.toString(), 'selectedCount')}
                      </p>
                    </Col>
                    <Col span={4}>
                      <p className="roboto-font">
                        {renderHighlightedField(jobs?.rejectedCount?.toString(), 'rejectedCount')}
                      </p>
                    </Col>
                    <Col span={2} className="flex items-center justify-center">
                      {renderActions(jobs)}
                    </Col>
                  </Row>
                </CommonCard>
              </div>
            ))}
          </div>
          <MasterPagination
            current={filters.page + 1}
            pageSize={filters.size || 10}
            total={data?.totalElements ?? 0}
            itemLabel="Job Openings"
            onPageChange={(page) => handlePageChange(page - 1)}
          />
        </div>
        {showDuplicateModal && (
          <ConfirmationModal
            onClose={() => setShowDuplicateModal(false)}
            onConfirm={handleDuplicate}
            title="Are you sure you want to duplicate?"
            confirmText="DUPLICATE"
            isLoading={isDuplicating}
          />
        )}

        <CloseJobModal
          visible={showCloseJobModal}
          onClose={() => {
            setShowCloseJobModal(false);
            setJobOpeningId(null);
          }}
          title={`Close Job Opening - ${jobName}`}
          jobOpeningId={jobOpeningId}
          interviewCount={interviewCount}
          onSuccess={refetch}
        />

        <JobListingNotesPanel
          open={Boolean(jobNotesFor)}
          onClose={() => {
            setJobNotesFor(null);
          }}
          jobTitle={jobNotesFor?.title}
          jobOpeningId={jobNotesFor?.id}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleJdFileChange}
        />

        <Modal
          open={showCreateJobModal}
          onCancel={() => setShowCreateJobModal(false)}
          footer={null}
          centered
          width={560}
          closable={false}
          destroyOnClose
        >
          <div className="p-4 relative">
            <Button
              className="absolute right-2 top-2 p-0 min-w-0 border-none shadow-none text-gray-500 hover:text-gray-700 cursor-pointer"
              onClick={() => setShowCreateJobModal(false)}
            >
              <CloseOutlined className="text-lg" />
            </Button>
            <h2 className="text-3xl font-semibold text-center mb-6">Create Job Opening</h2>
            <div className="space-y-3">
              <Button
                className="w-full border border-[var(--border)] rounded-md h-12 flex items-center justify-start px-4 bg-white"
                onClick={() => {
                  resetJdUploadState();
                  fileInputRef.current?.click();
                }}
              >
                <span className="h-8 w-8 rounded bg-primary text-white flex items-center justify-center mr-3">
                  <UploadOutlined />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold">UPLOAD JOB DESCRIPTION</span>
                  <span className="block text-xs text-gray-500">Supported format: docx, pdf</span>
                </span>
              </Button>

              <Button
                className="w-full border border-[var(--border)] rounded-md h-12 flex items-center justify-center"
                onClick={() => {
                  dispatch(resetJobState());
                  setShowCreateJobModal(false);
                  navigate('/job-details');
                }}
              >
                CREATE JOB MANUALLY
              </Button>

              <Button
                className="w-full border border-[var(--border)] rounded-md h-12 flex items-center justify-center"
                onClick={() => {
                  dispatch(resetJobState());
                  setShowCreateJobModal(false);
                  navigate('/ats-job-id');
                }}
              >
                UPLOAD FROM ATS
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={showJdUploadModal}
          onCancel={() => {
            resetJdUploadState();
            setShowJdUploadModal(false);
          }}
          footer={null}
          centered
          width={560}
          closable={false}
          destroyOnClose
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-semibold text-center w-full">Create Job Opening</h2>
              <Button
                className="absolute right-6 top-6 p-0 min-w-0"
                onClick={() => {
                  resetJdUploadState();
                  setShowJdUploadModal(false);
                }}
              >
                <CloseOutlined />
              </Button>
            </div>

            {jdFiles.length === 0 && (
              <Button
                className="w-full border border-[var(--border)] rounded-md h-12 flex items-center justify-start px-4 bg-white"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="h-8 w-8 rounded bg-primary text-white flex items-center justify-center mr-3">
                  <UploadOutlined />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold">UPLOAD JOB DESCRIPTION</span>
                  <span className="block text-xs text-gray-500">Supported format: docx, pdf</span>
                </span>
              </Button>
            )}

            {jdFiles.length > 0 && (
              <div className="space-y-3">
                <div className="w-full border border-blue-400 bg-blue-50 rounded-md min-h-12 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <span className="h-8 w-8 rounded bg-primary text-white flex items-center justify-center mr-3 shrink-0">
                      <UploadOutlined />
                    </span>
                    <span
                      className="text-sm truncate"
                      title={
                        jdFiles.length === 1 ? jdFiles[0].name : `${jdFiles.length} files selected`
                      }
                    >
                      {jdFiles.length === 1 ? jdFiles[0].name : `${jdFiles.length} files selected`}
                    </span>
                  </div>
                  {!isJdUploading && !isJdCompleted && (
                    <Button
                      className="p-0 min-w-0"
                      onClick={() => {
                        resetJdUploadState();
                      }}
                    >
                      <CloseOutlined />
                    </Button>
                  )}
                </div>

                {isJdUploading && jdFiles.length === 1 && (
                  <Typography
                    variant="caption"
                    className="text-primary font-medium flex items-center gap-2"
                  >
                    <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
                    Uploading and parsing...
                  </Typography>
                )}

                {jdFiles.length > 1 && (
                  <>
                    <p className="text-xs text-primary">
                      {`Progress: ${Math.round(jdProgress)}% of 100% completed`}
                    </p>
                    <div className="h-1 w-full bg-gray-200 rounded">
                      <div
                        className="h-1 bg-[#13b78f] rounded transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, jdProgress))}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {jdUploadError && <p className="text-sm text-red-500 mt-4">{jdUploadError}</p>}

            {isJdCompleted && jdFiles.length > 0 && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-4">
                  All uploaded jobs have been created as Draft jobs. You can review and publish them
                  from the Job Openings page.
                </p>
                {jdFiles.length === 1 ? (
                  <Button
                    className="text-white bg-button rounded-3xl px-4 py-2"
                    onClick={() => {
                      if (uploadedJobOpeningId) {
                        resetJdUploadState();
                        setShowJdUploadModal(false);
                        setShowCreateJobModal(false);
                        navigate(`/jobs/edit/${uploadedJobOpeningId}/details`);
                      } else {
                        handleGoToDraftJobs();
                      }
                    }}
                  >
                    GO TO JOB OPENING
                  </Button>
                ) : (
                  <Button
                    className="text-white bg-button rounded-3xl px-4 py-2"
                    onClick={handleGoToDraftJobs}
                  >
                    GO TO JOB OPENINGS
                  </Button>
                )}
              </div>
            )}
          </div>
        </Modal>

        {/* QR Management Modal */}
        <Modal
          open={qrModalOpen}
          onCancel={() => setQrModalOpen(false)}
          footer={null}
          centered
          closable
          width={520}
          destroyOnClose={false}
        >
          <QrCodeCard
            qrItem={masterQr}
            isLoading={isQrLoading || isGenerating}
            isTogglingActive={isTogglingActive}
            onGenerate={() => void handleQrGenerate()}
            onToggleActive={(active) => void handleQrToggleActive(active)}
            showGenerateButton={!masterQr}
            showToggle={false}
          />
        </Modal>
      </MainLayout>
    </div>
  );
};

export default JobsOpening;

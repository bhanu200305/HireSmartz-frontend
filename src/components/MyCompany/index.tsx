import React, { useState, useCallback } from 'react';
import { Tabs, Tooltip } from 'antd';
import type { TabsProps } from 'antd';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MdDelete,
  MdEdit,
  MdEmail,
  MdOutlineArrowBack,
  MdOutlineLocationOn,
  MdPhone,
} from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import OrganizationModel from './OrganizationModel';
import EmailTemplateConfig from './EmailTemplateConfig';
import SmsTemplatesTab from '../CompanySettings/SmsTemplatesTab';
import ScoringCriteriaOwnerTab from './ScoringCriteriaOwnerTab';
import CompanyDetails from '../CustomerDashboard/ViewCustomer/CompanyDetails';
import CompanyLocations from '../CustomerDashboard/ViewCustomer/CompanyLocations';
import { useGetCompanyDetailsQuery } from '../../api/tenant-service/Company/viewCompany';
import { useGetDepartmentsByCompanyIdQuery } from '../../api/tenant-service/Company/addCompany';
import { useGetFeatureFlagsQuery } from '../../api/authentication-service/FeatureFlags/index';
import { Loader } from '../shared/ui/loader';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import {
  convertFileToBase64,
  formatPhoneNumber,
  safeDecodeToken,
} from '../../shared/utils/methods';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
} from '../../constants/file.constants';
import {
  extractCanManageCompanySettings,
  isHiringManagerOrRecruiterRole,
} from '../../shared/utils/auth/permission.helpers';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import QrManagementTab from './QrManagementTab';
import { showToast } from '../shared';
import { sanitizeImagePreview } from '../../shared/utils/business-logic';

type AccessTokenPayload = {
  companyId?: number | string;
};

type CompanyLogoEditState = {
  base64: string;
  fileName: string;
  mimeType: string;
  previewUrl: string;
  isDirty: boolean;
  isDeleted: boolean;
};

const INITIAL_COMPANY_LOGO_EDIT_STATE: CompanyLogoEditState = {
  base64: '',
  fileName: '',
  mimeType: '',
  previewUrl: '',
  isDirty: false,
  isDeleted: false,
};

const MyCompany: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCompanyDetailsDirty, setIsCompanyDetailsDirty] = useState<boolean>(false);
  const [isCompanyDetailsEditMode, setIsCompanyDetailsEditMode] = useState<boolean>(false);
  const [showBackConfirmation, setShowBackConfirmation] = useState<boolean>(false);
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null);
  const [companyLogoEditState, setCompanyLogoEditState] = useState<CompanyLogoEditState>(
    INITIAL_COMPANY_LOGO_EDIT_STATE
  );
  const [isLogoHovered, setIsLogoHovered] = useState<boolean>(false);
  const logoFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleCompanyDirtyChange = useCallback((isDirty: boolean) => {
    setIsCompanyDetailsDirty(isDirty);
  }, []);
  const { loginToken, role, canManageCompanySettings } = useSelector(
    (state: RootState) => state.LoginSlice,
    shallowEqual
  );
  const currentTab = searchParams.get('tab') || '1';
  const tokenFromStorage = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) as string | null;
  const authToken = loginToken || tokenFromStorage;
  const decodedToken = safeDecodeToken<AccessTokenPayload>(authToken);
  const parsedCompanyId = decodedToken?.companyId;
  const canManageCompanySettingsFromToken = extractCanManageCompanySettings(authToken);
  const effectiveCanManageCompanySettings =
    canManageCompanySettings || canManageCompanySettingsFromToken;
  const isHiringManagerOrRecruiter = isHiringManagerOrRecruiterRole(role);
  const normalizedRoleName = role?.name?.trim().toLowerCase() || '';
  const normalizedRoleType = role?.type?.trim().toLowerCase() || '';
  const isMasterSuperAdmin = normalizedRoleName === 'master super admin';
  const isUser = normalizedRoleName === 'user' || normalizedRoleType === 'owner';
  const shouldShowCompanyDetailsOnly =
    isHiringManagerOrRecruiter && effectiveCanManageCompanySettings;
  const shouldRestrictCompanyAccess =
    isHiringManagerOrRecruiter && !effectiveCanManageCompanySettings;

  const isScoringCriteriaAllowed = React.useMemo(() => {
    const normalizeRoleIdentifier = (value?: string): string => {
      return (value || '').replace(/[_\s-]+/g, '').toLowerCase();
    };

    const name = normalizeRoleIdentifier(role?.name);
    const type = normalizeRoleIdentifier(role?.type);
    const isOrganizationUser = type === 'organization';
    const isCompanySuperAdmin = isOrganizationUser && name === 'superadmin';
    const isHiringManager = name === 'hiringmanager';
    const isMasterSuperAdmin = name === 'mastersuperadmin';

    return isCompanySuperAdmin || isHiringManager || isMasterSuperAdmin;
  }, [role]);

  const { data: featureFlags } = useGetFeatureFlagsQuery();

  const {
    data: companyData,
    isLoading,
    refetch,
  } = useGetCompanyDetailsQuery(
    { companyId: Number(parsedCompanyId) },
    { skip: !parsedCompanyId || isNaN(Number(parsedCompanyId)), refetchOnMountOrArgChange: true }
  );
  const { refetch: refetchDepartments } = useGetDepartmentsByCompanyIdQuery(
    { companyId: Number(parsedCompanyId) },
    {
      skip: !parsedCompanyId || isNaN(Number(parsedCompanyId)),
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  React.useEffect(() => {
    if (currentTab === '1') {
      refetch();
      refetchDepartments();
    }
  }, [currentTab, refetch, refetchDepartments]);

  const handleTabChange = (key: string) => {
    if (shouldShowCompanyDetailsOnly) {
      return;
    }

    const updatedParams = new URLSearchParams(searchParams);
    updatedParams.set('tab', key);

    if (key !== '3') {
      updatedParams.delete('subtab');
    }

    setSearchParams(updatedParams);
  };

  const resetHeaderEditDraft = useCallback(() => {
    setCompanyLogoEditState(INITIAL_COMPANY_LOGO_EDIT_STATE);
  }, []);

  const handleCompanyDetailsEditModeChange = useCallback(
    (isEditMode: boolean) => {
      setIsCompanyDetailsEditMode(isEditMode);
      if (!isEditMode) {
        resetHeaderEditDraft();
      }
    },
    [resetHeaderEditDraft]
  );

  const handleHeaderEditClick = useCallback(() => {
    if (currentTab !== '1' || isCompanyDetailsEditMode) {
      return;
    }

    setIsCompanyDetailsEditMode(true);
    resetHeaderEditDraft();
  }, [currentTab, isCompanyDetailsEditMode, resetHeaderEditDraft]);

  const handleLogoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    // Validate file type
    if (!ALLOWED_LOGO_TYPES.includes(selectedFile.type)) {
      showToast({ message: LOGO_FILE_TYPE_ERROR_MESSAGE, type: 'error' });
      return;
    }

    // Validate file size (must not exceed 5 MB)
    if (selectedFile.size > MAX_LOGO_FILE_SIZE_BYTES) {
      showToast({ message: LOGO_FILE_SIZE_ERROR_MESSAGE, type: 'error' });
      return;
    }

    try {
      const base64 = await convertFileToBase64(selectedFile);
      const previewUrl = sanitizeImagePreview(`data:${selectedFile.type};base64,${base64}`);

      if (!previewUrl) {
        showToast({ message: 'Invalid image format.', type: 'error' });
        return;
      }

      setCompanyLogoEditState({
        base64,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        previewUrl,
        isDirty: true,
        isDeleted: false,
      });
      showToast({
        message: 'Image uploaded successfully. Save changes to apply.',
        type: 'success',
      });
    } catch {
      showToast({ message: 'Failed to upload image.', type: 'error' });
    }
  }, []);

  const handleDeleteHeaderLogo = useCallback(() => {
    setCompanyLogoEditState({
      base64: '',
      fileName: '',
      mimeType: '',
      previewUrl: '',
      isDirty: true,
      isDeleted: true,
    });
    showToast({ message: 'Logo removed. Save changes to apply.', type: 'success' });
  }, []);

  const headerLogoSrc = companyLogoEditState.isDeleted
    ? ''
    : companyLogoEditState.previewUrl || sanitizeImagePreview(companyData?.companyLogo || '');
  const companyAddress =
    [companyData?.addressLine1, companyData?.addressLine2, companyData?.city, companyData?.state]
      .filter(Boolean)
      .join(', ') || '-';
  const companyAddressMapUrl = companyAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(companyAddress)}`
    : '';
  const canShowHeaderEditIcon =
    currentTab === '1' && !isCompanyDetailsEditMode && !isMasterSuperAdmin && !isUser;
  const canEditHeaderLogo =
    currentTab === '1' && isCompanyDetailsEditMode && !isMasterSuperAdmin && !isUser;

  const doBackNavigation = useCallback(() => {
    if (shouldShowCompanyDetailsOnly) {
      navigate('/');
      return;
    }

    if (currentTab === '3') {
      const updatedParams = new URLSearchParams(searchParams);
      updatedParams.set('tab', '2');
      updatedParams.delete('subtab');
      setSearchParams(updatedParams);
      return;
    }

    if (currentTab === '2') {
      const updatedParams = new URLSearchParams(searchParams);
      updatedParams.set('tab', '1');
      updatedParams.delete('subtab');
      setSearchParams(updatedParams);
      return;
    }
    if (currentTab === '1') {
      navigate('/');
    }
  }, [shouldShowCompanyDetailsOnly, currentTab, navigate, searchParams, setSearchParams]);

  const handleBackNavigation = () => {
    if (isCompanyDetailsDirty) {
      setPendingNavAction(() => doBackNavigation);
      setShowBackConfirmation(true);
      return;
    }
    doBackNavigation();
  };

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'Company Details',
      children: companyData ? (
        <CompanyDetails
          companyData={companyData}
          onCompanyUpdated={refetch}
          onDirtyChange={handleCompanyDirtyChange}
          isEditMode={isCompanyDetailsEditMode}
          onEditModeChange={handleCompanyDetailsEditModeChange}
          logoEditState={companyLogoEditState}
        />
      ) : (
        <div className="p-6 text-gray-500">Company details not available.</div>
      ),
    },
    {
      key: '2',
      label: 'Locations',
      children: parsedCompanyId ? (
        <CompanyLocations companyId={String(parsedCompanyId)} />
      ) : (
        <div className="p-6 text-gray-500">Company locations not available.</div>
      ),
    },
    {
      key: '3',
      label: 'Company Settings',
      children: <OrganizationModel />,
    },
    ...(featureFlags?.emailTemplateConfig
      ? [
          {
            key: '4',
            label: 'Email Templates Config',
            children: <EmailTemplateConfig />,
          },
        ]
      : []),
    {
      key: '5',
      label: 'SMS Templates',
      children: (
        <SmsTemplatesTab
          fixedCompanyId={parsedCompanyId ? Number(parsedCompanyId) : null}
          showCompanySelect={false}
        />
      ),
    },
    ...(parsedCompanyId && isScoringCriteriaAllowed
      ? [
          {
            key: '6',
            label: 'Scoring Criteria Configuration',
            children: <ScoringCriteriaOwnerTab companyId={Number(parsedCompanyId)} />,
          },
        ]
      : []),
    {
      key: '7',
      label: 'QR Management',
      children: parsedCompanyId ? <QrManagementTab companyId={Number(parsedCompanyId)} /> : null,
    },
  ];

  if (shouldRestrictCompanyAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <MainLayout>
        <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-16">
          <div className="mb-4 self-start px-4 absolute">
            <button
              onClick={handleBackNavigation}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
            >
              <MdOutlineArrowBack className="mr-2" />
              <span>Back</span>
            </button>
          </div>
          <div className="bg-[#FAFAFA] p-6 md:p-6 rounded-2xl shadow-lg w-full max-w-6xl flex flex-col">
            {isLoading && <Loader />}
            {shouldShowCompanyDetailsOnly ? (
              <div className="px-2 sm:px-6 py-2 sm:py-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
                  Company Settings
                </h2>
                <OrganizationModel />
              </div>
            ) : (
              <>
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div className="flex gap-4 bg-white rounded-3xl p-4 mb-6 border border-gray-100">
                  <div
                    className="relative w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden group"
                    onMouseEnter={() => setIsLogoHovered(true)}
                    onMouseLeave={() => setIsLogoHovered(false)}
                  >
                    {headerLogoSrc ? (
                      <img
                        src={headerLogoSrc}
                        alt={companyData?.companyName || 'Company Logo'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-white">
                        {companyData?.companyName?.toUpperCase()?.[0] || ''}
                      </span>
                    )}
                    {canEditHeaderLogo && isLogoHovered && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 gap-2">
                        <div
                          onClick={() => logoFileInputRef.current?.click()}
                          className="bg-primary rounded-full p-2 cursor-pointer hover:bg-primary-dark"
                        >
                          <MdEdit className="text-white text-xl" />
                        </div>
                        {headerLogoSrc && (
                          <div
                            className="bg-red-500 rounded-full p-2 cursor-pointer hover:bg-red-600"
                            onClick={handleDeleteHeaderLogo}
                          >
                            <MdDelete className="text-white text-xl" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {companyData?.companyName}
                    </h2>
                    <div className="flex items-center text-sm gap-2">
                      <MdEmail size={16} />
                      {companyData?.primaryEmail ? (
                        <a href={`mailto:${companyData.primaryEmail}`} className="underline">
                          {companyData.primaryEmail}
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                    <div className="flex items-center text-sm gap-2 ">
                      <MdPhone size={16} />
                      {companyData?.primaryPhone ? (
                        <a
                          href={`tel:${companyData?.primaryCountryCode || ''}${companyData.primaryPhone}`}
                          className="underline"
                        >
                          {companyData?.primaryCountryCode || ''}
                          {formatPhoneNumber(companyData.primaryPhone)}
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                    <div className="flex items-center text-sm gap-2 ">
                      <MdOutlineLocationOn size={16} />
                      {companyAddress !== '-' ? (
                        <a
                          href={companyAddressMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {companyAddress}
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </div>
                  {canShowHeaderEditIcon && (
                    <div className="items-start flex">
                      <Tooltip title="Edit company details">
                        <button
                          type="button"
                          className="p-2 hover:bg-gray-100 rounded-full"
                          aria-label="Edit company details"
                          onClick={handleHeaderEditClick}
                        >
                          <MdEdit size={16} className="text-gray-600" />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>

                <Tabs
                  activeKey={currentTab}
                  onChange={handleTabChange}
                  items={items}
                  className="my-company-tabs px-2 sm:px-6 py-2 sm:py-4"
                />
              </>
            )}
          </div>
        </div>
      </MainLayout>
      {showBackConfirmation && (
        <ConfirmationModal
          title="Are you sure you want to leave? Unsaved changes will be lost."
          confirmText="LEAVE PAGE"
          onConfirm={() => {
            setShowBackConfirmation(false);
            pendingNavAction?.();
            setPendingNavAction(null);
          }}
          onClose={() => {
            setShowBackConfirmation(false);
            setPendingNavAction(null);
          }}
        />
      )}
    </>
  );
};

export default MyCompany;

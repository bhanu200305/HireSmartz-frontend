import {
  MdEdit,
  MdOutlineArchive,
  MdOutlineArrowBack,
  MdOutlineEmail,
  MdOutlineLocalPhone,
} from 'react-icons/md';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { RiUserCommunityLine } from 'react-icons/ri';
import MainLayout from '../../../layouts/MainLayout';
import { Input, showToast } from '../../shared';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Switch, Tooltip } from 'antd';
import { get } from 'lodash-es';
import { useEffect } from 'react';
import { Loader } from '../../shared/ui/loader';
import {
  useArchiveOrgUserMutation,
  useGetViewOrgUserDetailsQuery,
} from '../../../api/tenant-service/Organisation/AddOrganisationUser';
import { formatPhoneNumber } from '../../../shared/utils/methods';
import { isHMOrRecruiter } from '../../../shared/utils/business-logic';

const ViewOrgUser = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgUserId = searchParams.get('orgUserId');
  const companyId = Number(searchParams.get('companyId') || 0);
  const returnTo = searchParams.get('returnTo');
  const navigateBack = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }

    navigate(-1);
  };
  const { data, isLoading, refetch } = useGetViewOrgUserDetailsQuery({
    userId: Number(orgUserId),
    companyId: companyId || undefined,
  });
  const userData = data || ({} as any);
  const [archiveUser, { isLoading: isArchiving }] = useArchiveOrgUserMutation();
  const isActive = userData?.status ?? false;

  const isRecruiterOrHiringManager = isHMOrRecruiter(userData?.role);
  const allowMultiLocationAccess = userData?.allowMultiLocationAccess ?? false;
  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleEdit = (id: number) => {
    const companyQuery = companyId ? `&companyId=${companyId}` : '';
    const returnToQuery = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : '';

    navigate(`/edit-organisation-user?orgUserId=${id}${companyQuery}${returnToQuery}`, {
      state: { userData },
    });
  };

  const handleArchive = async () => {
    if (!orgUserId) return;

    archiveUser({
      userId: Number(orgUserId),
      isArchived: !userData.archived,
      companyId: companyId || undefined,
    })
      .unwrap()
      .then((res) => {
        showToast({
          message: get(
            res,
            'message',
            userData.archived
              ? 'User has been unarchived successfully'
              : 'User has been archived successfully'
          ),
          type: 'success',
        });
        navigateBack();
      })
      .catch((err) => {
        showToast({
          message: get(
            err,
            'data.message',
            userData.archived
              ? 'Failed to unarchive user. Please try again.'
              : 'Failed to archive user. Please try again.'
          ),
          type: 'error',
        });
      });
  };
  return (
    <div>
      <MainLayout>
        <div className="p-4 pt-16 relative">
          {(isLoading || isArchiving) && <Loader />}
          <div className="mb-4 self-start px-6 py-4 absolute">
            <button
              onClick={navigateBack}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
            >
              <MdOutlineArrowBack className="mr-2" />
              <span>Back</span>
            </button>
          </div>
          <div className="w-full p-4 pt-14">
            <div className="flex gap-4 bg-[#FAFAFA] rounded-3xl p-4">
              <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                {userData.profilePicture ? (
                  <img
                    src={userData.profilePicture}
                    alt={`${userData.firstName} ${userData.lastName}`}
                    className="w-24 h-24 rounded-full flex items-center justify-center object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.outerHTML = `
        <span class="w-24 h-24 rounded-full bg-gray-300 text-xl font-semibold text-white flex items-center justify-center">
          ${(userData.firstName?.toUpperCase()[0] || '') + (userData.lastName?.toUpperCase()[0] || '')}
        </span>`;
                    }}
                  />
                ) : (
                  <span className="w-24 h-24 rounded-full bg-gray-300 text-xl font-semibold text-white flex items-center justify-center">
                    {userData.firstName?.toUpperCase()[0] || ''}
                    {userData.lastName?.toUpperCase()[0] || ''}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">
                  {userData.firstName} {userData.lastName}
                </h2>
                <div className="flex items-center text-sm gap-2">
                  <MdOutlineEmail size={16} />
                  <a href={`mailto:${userData.emailId}`} className="underline">
                    {userData.emailId}
                  </a>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <MdOutlineLocalPhone size={16} />
                  <a href={`tel:${userData.phoneNumber}`} className="underline">
                    {userData.countryCode}
                    {formatPhoneNumber(userData.phoneNumber)}
                  </a>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <RiUserCommunityLine size={16} />
                  <span>{userData.role || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <HiOutlineBuildingOffice2 size={16} />
                  <span>{userData.companyName || 'N/A'}</span>
                </div>
              </div>
              <div className="items-start flex gap-1">
                {!userData.archived && (
                  <Tooltip title="Edit user">
                    <button
                      className="p-2 hover:bg-gray-300 cursor-pointer"
                      onClick={() => handleEdit(Number(orgUserId))}
                    >
                      <MdEdit size={16} />
                    </button>
                  </Tooltip>
                )}
                <Tooltip title={userData.archived ? 'Unarchive user' : 'Archive user'}>
                  <button className="p-2 hover:bg-gray-300 cursor-pointer" onClick={handleArchive}>
                    <MdOutlineArchive size={16} />
                  </button>
                </Tooltip>
                <div className={`p-1 text-sm`}>
                  <Switch
                    checked={isActive}
                    disabled
                    checkedChildren="ACTIVE"
                    unCheckedChildren="INACTIVE"
                    style={{
                      backgroundColor: isActive ? 'var(--color-primary)' : '#CDC721',
                      color: 'white',
                      opacity: isActive ? 1 : 1,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {/* First Name */}
              <div>
                <label className="text-sm capitalize">
                  First Name <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  value={userData.firstName || ''}
                  disabled
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="text-sm capitalize">
                  Last Name <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  value={userData.lastName || ''}
                  disabled
                />
              </div>
              {/* Employee ID */}
              <div>
                <label className="text-sm capitalize">
                  Employee ID <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  value={userData.employeeId || ''}
                  disabled
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm capitalize">
                  Email <span className="required-asterisk">*</span>
                </label>
                <Input
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  value={userData.emailId || ''}
                  disabled
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-sm capitalize">
                  Phone Number <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  value={
                    userData.countryCode && userData.phoneNumber
                      ? `${userData.countryCode}${formatPhoneNumber(userData.phoneNumber)}`
                      : (userData.countryCode || '') +
                        (formatPhoneNumber(userData.phoneNumber) || '')
                  }
                  disabled
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-sm capitalize">
                  Role <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  value={userData.role || 'N/A'}
                  disabled
                />
                {isRecruiterOrHiringManager && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="canManageCompanySettingsView"
                      checked={!!userData.canManageCompanySettings}
                      readOnly
                      className="w-4 h-4 cursor-not-allowed"
                    />
                    <label
                      htmlFor="canManageCompanySettingsView"
                      className="text-sm text-gray-600 cursor-default"
                    >
                      Allow access to manage Company Settings
                    </label>
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="text-sm capitalize">
                  Location <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  value={userData?.primaryLocation?.name || 'N/A'}
                  disabled
                />
                {/* Multi-location access checkbox — read-only, recruiter / hiring manager only */}
                {isRecruiterOrHiringManager && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="allowMultiLocationView"
                      checked={allowMultiLocationAccess}
                      readOnly
                      className="w-4 h-4 cursor-not-allowed"
                    />
                    <label
                      htmlFor="allowMultiLocationView"
                      className="text-sm text-gray-600 cursor-default"
                    >
                      Allow access to jobs across multiple locations
                    </label>
                  </div>
                )}
              </div>

              {/* Multiple locations — only when allowMultiLocationAccess is true */}
              {isRecruiterOrHiringManager && allowMultiLocationAccess && (
                <div className="col-span-1">
                  <label className="text-sm capitalize">Choose Locations</label>
                  <Input
                    type="text"
                    className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                    value={`${Array.isArray(userData.accessibleLocations) ? userData.accessibleLocations.length : 0} locations selected`}
                    disabled
                  />

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-3 max-h-40 overflow-auto pr-2">
                    {Array.isArray(userData.accessibleLocations) &&
                    userData.accessibleLocations.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Selected Locations
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {userData.accessibleLocations.map(
                            (location: {
                              id: number;
                              name?: string;
                              locationName?: string;
                              status?: boolean;
                            }) => {
                              const isBase =
                                Number(location.id) === Number(userData?.primaryLocation?.id);
                              return (
                                <span
                                  key={location.id}
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                    isBase
                                      ? 'bg-primary text-white border-primary'
                                      : location.status === false
                                        ? 'bg-gray-100 text-gray-600 border-gray-300'
                                        : 'bg-brand-100 text-brand-800 border-brand-200'
                                  }`}
                                >
                                  {location.name || location.locationName || ''}
                                  {location.status === false && (
                                    <span className="ml-1 text-xs italic">(Deactivated)</span>
                                  )}
                                </span>
                              );
                            }
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-600">No locations assigned</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </div>
  );
};

export default ViewOrgUser;

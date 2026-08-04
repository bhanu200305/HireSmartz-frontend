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
import { useGetUserDetailsQuery } from '../../../api/tenant-service/User/viewUser';
import type { ViewUserTypes } from '../../../types';
import { Loader } from '../../shared/ui/loader';
import { useArchiveUserMutation } from '../../../api/tenant-service/User/archiveUser';
import { get } from 'lodash-es';
import { useEffect } from 'react';
import { formatPhoneNumber, safeDecodeToken } from '../../../shared/utils/methods';
import { hasFeatureAccess } from '../../../shared/utils/auth/getAccess';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '../../../redux/provider/store';

const ViewUser = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const { role } = useSelector((state: RootState) => state.LoginSlice, shallowEqual);
  const { loginToken } = useSelector((state: any) => state.LoginSlice);
  const { data, isLoading, refetch } = useGetUserDetailsQuery({ userId: Number(userId) });
  const userData: ViewUserTypes = data || ({} as ViewUserTypes);
  const [archiveUser, { isLoading: isArchiving }] = useArchiveUserMutation();
  const isActive = userData?.status ?? false;
  const decodedToken = safeDecodeToken<{ companyName: string }>(loginToken);
  const companyName = decodedToken?.companyName || undefined;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleEdit = (id: number) => {
    navigate(`/edit-user?userId=${id}`, { state: { userData } });
  };

  const handleArchive = async () => {
    if (!userId) return;
    archiveUser({
      userId: Number(userId),
      isArchived: !userData.archived,
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
        navigate(-1);
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
              onClick={() => navigate(-1)}
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
                  <span>{companyName || 'N/A'}</span>
                </div>
              </div>
              {!hasFeatureAccess(role.name.toLowerCase() as any, 'view', role) && (
                <div className="items-start flex gap-1">
                  {!userData.archived && (
                    <Tooltip title="Edit user">
                      <button
                        className="p-2 hover:bg-gray-300 cursor-pointer"
                        onClick={() => handleEdit(Number(userId))}
                      >
                        <MdEdit size={16} />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip title={userData.archived ? 'Unarchive user' : 'Archive user'}>
                    <button
                      className="p-2 hover:bg-gray-300 cursor-pointer"
                      onClick={handleArchive}
                    >
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
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {/* First Name */}
              <div>
                <label className="text-sm capitalize">
                  First Name <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
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
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  value={userData.lastName || ''}
                  disabled
                />
              </div>
              {/* Title */}
              <div>
                <label className="text-sm capitalize">
                  Title <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  value={userData.title || ''}
                  disabled
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm capitalize">
                  Email <span className="required-asterisk">*</span>
                </label>
                <Input
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
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
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
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
                  className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  value={userData.role || 'N/A'}
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </div>
  );
};

export default ViewUser;

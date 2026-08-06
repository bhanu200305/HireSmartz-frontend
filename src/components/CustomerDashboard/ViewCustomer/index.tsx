import {
  MdEdit,
  MdOutlineArchive,
  MdOutlineArrowBack,
  MdOutlineEmail,
  MdOutlineLocalPhone,
  MdOutlineLocationOn,
} from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { showToast } from '../../shared';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Switch, Tooltip, Tabs } from 'antd';
import { Loader } from '../../shared/ui/loader';
import { get } from 'lodash-es';
import {
  CompanyDetailsResponse,
  useGetCompanyDetailsQuery,
} from '../../../api/tenant-service/Company/viewCompany';
import { useGetCompanyLocationsFilterQuery } from '../../../api/tenant-service/Company/addCompany';
import { useArchiveCompanyMutation } from '../../../api/tenant-service/Company/archiveCompany';
import { useEffect, useState } from 'react';
import { formatPhoneNumber } from '../../../shared/utils/methods';
import { hasFeatureAccess } from '../../../shared/utils/auth/getAccess';
import { useSelector, shallowEqual } from 'react-redux';

import { RootState } from '../../../redux/provider/store';
import CompanyDetails from './CompanyDetails';
import CompanyLocations from './CompanyLocations';
import CompanyUsers from './CompanyUsers';

const ViewCustomer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useSelector((state: RootState) => state.LoginSlice, shallowEqual);
  const companyId = searchParams.get('companyId');
  const parsedCompanyId = Number(companyId || 0);
  const { data, isLoading, refetch } = useGetCompanyDetailsQuery(
    { companyId: parsedCompanyId },
    { skip: !companyId || isNaN(Number(companyId)) }
  );
  // TODO: query result isn't read anywhere in this file (CompanyLocations
  // below fetches its own copy with different params) — this call's purpose
  // is unclear. Left in place rather than guessing it's safe to remove.
  useGetCompanyLocationsFilterQuery(
    {
      companyId: parsedCompanyId,
      status: 'ALL',
      page: 0,
      size: 100,
      sortBy: 'createdAt',
      sortDir: 'desc',
    },
    { skip: !parsedCompanyId }
  );
  const companyData: CompanyDetailsResponse = data || ({} as CompanyDetailsResponse);
  const [archieveCompany, { isLoading: isArchiving }] = useArchiveCompanyMutation();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || '1');
  const isActive = companyData?.status ?? false;
  const canManageLocations = companyData?.allowedToManageLocation ?? false;
  const isScoringConfigEditable =
    companyData?.scoringConfigEditable ?? companyData?.isScoringConfigEditable ?? false;
  const candidateIntroEnabled = Boolean(companyData?.candidateIntroEnabled);
  const candidateEnquiriesEnabled = Boolean(companyData?.candidateEnquiriesEnabled);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, searchParams]);

  const handleEdit = (id: number) => {
    navigate(`/edit-company?companyId=${id}`, { state: { companyData } });
  };

  const handleArchive = async () => {
    if (!companyId) return;

    archieveCompany({ companyId: Number(companyId), isArchived: !companyData.archived })
      .unwrap()
      .then((res) => {
        showToast({
          message: get(
            res,
            'message',
            companyData.archived
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
            companyData.archived
              ? 'Failed to unarchive user. Please try again.'
              : 'Failed to archive user. Please try again.'
          ),
          type: 'error',
        });
      });
  };

  const onTabChange = (key: string) => {
    setActiveTab(key);
  };

  const locations = get(companyData, 'locations', []) as Array<Record<string, unknown>>;
  const primaryLocation =
    locations.find((location) => get(location, 'primary', false) === true) ||
    (get(companyData, 'primaryLocation', null) as Record<string, unknown> | null) ||
    (get(companyData, 'location', null) as Record<string, unknown> | null);

  const companyAddress = [
    get(primaryLocation, 'addressLine1', companyData.addressLine1),
    get(primaryLocation, 'addressLine2', companyData.addressLine2),
    get(primaryLocation, 'city', companyData.city),
    get(primaryLocation, 'state', companyData.state),
    get(primaryLocation, 'zipCode', get(primaryLocation, 'zip', companyData.zip)),
    get(primaryLocation, 'country', companyData.country),
  ]
    .filter(Boolean)
    .join(', ');

  const companyAddressMapUrl = companyAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(companyAddress)}`
    : '';

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
            {/* Company Header - Always visible */}
            <div className="flex gap-4 bg-[#FAFAFA] rounded-3xl p-4 mb-6">
              <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                {companyData.companyLogo ? (
                  <img
                    src={companyData.companyLogo}
                    alt={companyData.companyName || 'Company Logo'}
                    className="w-24 h-24 rounded-full flex items-center justify-center object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.outerHTML = `
                      <span class="w-24 h-24 rounded-full bg-gray-300 text-xl font-semibold text-white flex items-center justify-center">
                        ${companyData.companyName?.toUpperCase()[0] || ''}
                      </span>`;
                    }}
                  />
                ) : (
                  <span className="w-24 h-24 rounded-full bg-gray-300 text-xl font-semibold text-white flex items-center justify-center">
                    {companyData.companyName?.toUpperCase()[0] || ''}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{companyData.companyName}</h2>
                <div className="flex items-center text-sm gap-2">
                  <MdOutlineEmail size={16} />
                  <a href={`mailto:${companyData.primaryEmail}`} className="underline">
                    {companyData.primaryEmail}
                  </a>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <MdOutlineLocalPhone size={16} />
                  <a href={`tel:${companyData.primaryPhone}`} className="underline">
                    {companyData.primaryCountryCode}
                    {formatPhoneNumber(companyData.primaryPhone ?? '')}
                  </a>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <MdOutlineLocationOn size={16} />
                  {companyAddress ? (
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
              {!hasFeatureAccess(role.name.toLowerCase() as any, 'view', role) && (
                <div className="items-start flex gap-1">
                  <div className="p-1 text-sm flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5 self-end">
                      <Tooltip title="Edit company">
                        <button
                          className="p-2 hover:bg-gray-300 rounded-full"
                          onClick={() => handleEdit(Number(companyId))}
                        >
                          <MdEdit size={16} />
                        </button>
                      </Tooltip>
                      <Tooltip
                        title={companyData.archived ? 'Unarchive Company' : 'Archive Company'}
                      >
                        <button
                          className="p-2 hover:bg-gray-300 rounded-full"
                          onClick={handleArchive}
                        >
                          <MdOutlineArchive size={16} />
                        </button>
                      </Tooltip>
                      <Switch
                        checked={isActive}
                        disabled
                        checkedChildren="ACTIVE"
                        unCheckedChildren="INACTIVE"
                        style={{
                          backgroundColor: isActive ? 'var(--color-primary)' : '#CDC721',
                          color: 'white',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <span className="text-sm whitespace-nowrap">
                        Allow Company to Manage Locations
                      </span>
                      <Switch
                        checked={canManageLocations}
                        disabled
                        style={{
                          backgroundColor: canManageLocations ? 'var(--color-primary)' : undefined,
                          color: 'white',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <span className="text-sm whitespace-nowrap">Is Scoring Config Editable</span>
                      <Switch
                        checked={Boolean(isScoringConfigEditable)}
                        disabled
                        style={{
                          backgroundColor: isScoringConfigEditable
                            ? 'var(--color-primary)'
                            : undefined,
                          color: 'white',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <span className="text-sm whitespace-nowrap">
                        Enable Candidate Intro in AI Audio Call
                      </span>
                      <Switch
                        checked={candidateIntroEnabled}
                        disabled
                        style={{
                          backgroundColor: candidateIntroEnabled
                            ? 'var(--color-primary)'
                            : undefined,
                          color: 'white',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <span className="text-sm whitespace-nowrap">
                        Enable General Inquiry in AI Audio Call
                      </span>
                      <Switch
                        checked={candidateEnquiriesEnabled}
                        disabled
                        style={{
                          backgroundColor: candidateEnquiriesEnabled
                            ? 'var(--color-primary)'
                            : undefined,
                          color: 'white',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={onTabChange}
              items={[
                {
                  key: '1',
                  label: <span className="px-4 py-2 font-medium">Company Details</span>,
                  children: <CompanyDetails companyData={companyData} onCompanyUpdated={refetch} />,
                },
                {
                  key: '2',
                  label: <span className="px-4 py-2 font-medium">Locations</span>,
                  children: <CompanyLocations companyId={companyId} onLocationsUpdated={refetch} />,
                },
                {
                  key: '3',
                  label: <span className="px-4 py-2 font-medium">Users</span>,
                  children: <CompanyUsers />,
                },
              ]}
              className="custom-tabs"
            />
          </div>
        </div>
      </MainLayout>
    </div>
  );
};

export default ViewCustomer;

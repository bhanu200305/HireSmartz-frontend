import { useEffect, useState, useRef } from 'react';
import { Col, Row, Spin } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LuUsersRound } from 'react-icons/lu';
import { MdOutlineArrowBack } from 'react-icons/md';

import MainLayout from '../../../layouts/MainLayout';
import { Loader } from '../../shared/ui/loader';
import { COL } from '../../shared/ui/Columns';
import renderHighlightedField from '../../shared/ui/RenderHighlightedField';
import { formatPhoneNumber, formatStatus } from '../../../shared/utils/methods';
import MasterPagination from '../../shared/ui/MasterPagination';
import { CommonCard, Search } from '../../shared';

const SearchCandidateListing = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get data from global search navigation state
  const { candidatesData, searchQuery, fromGlobalSearch } = location.state || {};

  const [collapsedCandidates, setCollapsedCandidates] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading] = useState(false);
  const [filteredCandidates, setFilteredCandidates] = useState<any[]>([]);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isFromGlobalSearch, setIsFromGlobalSearch] = useState(false);
  const hasResetRef = useRef(false);

  // Initialize candidates from global search data
  useEffect(() => {
    if (
      fromGlobalSearch &&
      candidatesData &&
      Array.isArray(candidatesData) &&
      !hasResetRef.current
    ) {
      hasResetRef.current = true;
      setIsFromGlobalSearch(true);

      // Transform the global search data to match your component's expected format
      const transformedCandidates = candidatesData.map((item: any) => ({
        id: String(item.extraJson?.id || item.sourceId), // Ensure id is a string
        docId: item.docId,
        sourceType: item.sourceType,
        firstName: item.title?.split(' ')[0] || '',
        lastName: item.title?.split(' ').slice(1).join(' ') || '',
        emailId: item.extraJson?.email || '',
        phoneNumber: item.extraJson?.phone_number || '',
        countryCode: item.extraJson?.country_code || '',
        currentCompany: item.extraJson?.current_job_title || '',
        source: item.extraJson?.source || 'Website Upload',
        address: item.extraJson?.address || '',
        job_opening_id: item.extraJson?.job_opening_id,
        resume_status: item.extraJson?.resume_status,
        ats_score: item.extraJson?.ats_score,
        originalData: item, // Keep the original data for reference
      }));

      setCandidates(transformedCandidates);
      setFilteredCandidates(transformedCandidates);

      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        const matchingIds = transformedCandidates
          .filter(
            (candidate) =>
              candidate.firstName.toLowerCase().includes(term) ||
              candidate.lastName.toLowerCase().includes(term) ||
              candidate.emailId.toLowerCase().includes(term) ||
              candidate.phoneNumber.includes(searchQuery) ||
              candidate.currentCompany?.toLowerCase().includes(term) ||
              (candidate.address?.toLowerCase() || '').includes(term) ||
              ((candidate.originalData?.extraJson?.education as string) || '')
                .toLowerCase()
                .includes(term)
          )
          .map((candidate) => candidate.id);
        setCollapsedCandidates(matchingIds);
      }
    }
  }, [fromGlobalSearch, candidatesData, searchQuery]);

  const applySearch = (term: string, pool: any[]) => {
    if (!term.trim()) {
      return { filtered: pool, expandedIds: [] as string[] };
    }
    const lower = term.toLowerCase();
    const filtered = pool.filter(
      (candidate) =>
        candidate.firstName.toLowerCase().includes(lower) ||
        candidate.lastName.toLowerCase().includes(lower) ||
        candidate.emailId.toLowerCase().includes(lower) ||
        candidate.phoneNumber.includes(term) ||
        candidate.currentCompany?.toLowerCase().includes(lower) ||
        (candidate.address?.toLowerCase() || '').includes(lower) ||
        ((candidate.originalData?.extraJson?.education as string) || '')
          .toLowerCase()
          .includes(lower)
    );
    const expandedIds = filtered.map((c: any) => c.id);
    return { filtered, expandedIds };
  };

  // Handle local search within the candidate list
  const handleSearch = (query: string) => {
    setLocalSearchQuery(query);
    setCurrentPage(1);

    if (!query.trim()) {
      const fallback = isFromGlobalSearch && searchQuery ? searchQuery : '';
      if (fallback) {
        const { filtered, expandedIds } = applySearch(fallback, candidates);
        setFilteredCandidates(filtered);
        setCollapsedCandidates(expandedIds);
      } else {
        setFilteredCandidates(candidates);
        setCollapsedCandidates([]);
      }
      return;
    }

    const { filtered } = applySearch(query, candidates);
    const globalTerm = isFromGlobalSearch && searchQuery ? searchQuery : '';
    const expandedIds = filtered
      .filter((c: any) => {
        const lowerInternal = query.toLowerCase();
        const lowerGlobal = globalTerm.toLowerCase();
        const fields = [
          c.firstName,
          c.lastName,
          c.emailId,
          c.phoneNumber,
          c.currentCompany,
          c.address,
          (c.originalData?.extraJson?.education as string) || '',
        ];
        return fields.some(
          (f) =>
            (f || '').toLowerCase().includes(lowerInternal) ||
            (lowerGlobal && (f || '').toLowerCase().includes(lowerGlobal))
        );
      })
      .map((c: any) => c.id);
    setFilteredCandidates(filtered);
    setCollapsedCandidates(expandedIds);
  };

  const toggleCollapse = (key: string) => {
    setCollapsedCandidates((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate paginated data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);
  const totalItems = filteredCandidates.length;

  // Determine the title based on context
  const isResults = isFromGlobalSearch && searchQuery;

  const highlightFilters = {
    searchQuery: localSearchQuery,
    globalSearchRequestDto: { text: isFromGlobalSearch && searchQuery ? searchQuery : '' },
  };

  return (
    <>
      <MainLayout>
        <div className="w-full p-8 justify-start pt-16">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex w-fit items-center text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            <MdOutlineArrowBack className="mr-2" />
            <span>Back</span>
          </button>
          {isLoading && <Loader />}
          <div className="flex space-x-4 justify-between p-2">
            {isResults ? (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
                    <LuUsersRound size={18} />
                  </span>
                  <h2 className="text-xl font-semibold">&apos;Showing Results&apos;</h2>
                </div>
                <span className="text-gray-500 text-sm">for &quot;{searchQuery}&quot;</span>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
                    <LuUsersRound size={18} />
                  </span>
                  <h2 className="text-xl font-semibold">&apos;Candidates&apos;</h2>
                </div>
                <span className="text-gray-500 text-sm">for &quot;{searchQuery}&quot;</span>
              </div>
            )}
            <div className="flex space-x-4 items-center">
              <Search
                appname="Candidate"
                placeholder="Search candidates"
                onSearch={handleSearch}
                allowClear
                value={localSearchQuery}
              />
            </div>
          </div>

          {/* overflow-x-auto + min-w keeps columns readable on narrow viewports,
              same pattern as CandidatesListing.tsx — header and rows share one
              scroll container so they stay column-aligned while scrolling. */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="w-full p-2 justify-start">
                <Row
                  gutter={[16, 16]}
                  className="font-bold py-2 px-2 bg-[#FAFAFA] border border-[var(--border)] heading-font"
                >
                  <COL span={6} className="px-4 py-2 border-[var(--border)]">
                    CANDIDATE DETAILS
                  </COL>
                  <Col span={4} className="px-4 py-2 border-[var(--border)]">
                    RESUME SCORE
                  </Col>
                  <Col span={4} className="px-4 py-2">
                    APPLIED JOB OPENING
                  </Col>
                  <Col span={4} className="px-4 py-2 border-[var(--border)]">
                    STATUS
                  </Col>
                  <Col span={4} className="px-4 py-2 border-[var(--border)]">
                    SOURCE
                  </Col>
                </Row>
              </div>

              <div className="w-full">
                {paginatedCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {candidates.length === 0
                        ? 'No candidates found from global search'
                        : 'No candidates match your search criteria'}
                    </p>
                  </div>
                ) : (
                  paginatedCandidates.map((candidate) => {
                    const atsScore = candidate.originalData.extraJson.ats_score;
                    const jobTitle = candidate.originalData.extraJson.job_title;
                    const currentJobTitle = candidate.originalData.extraJson.current_job_title;
                    const interviewExternalStatus =
                      candidate.originalData.extraJson.interview_external_status;
                    const interviewStatus = candidate.originalData.extraJson.interview_status;
                    const resumeExtracted = candidate.originalData.extraJson.is_resume_extracted;

                    return (
                      <div key={candidate.id} className="mb-2">
                        <CommonCard>
                          <Row gutter={[16, 16]} align="middle">
                            <Col span={6}>
                              <div className="flex items-center">
                                <div
                                  className="cursor-pointer flex items-center"
                                  onClick={() => toggleCollapse(candidate.id)}
                                >
                                  <Link
                                    to={`/jobs/view/${candidate.job_opening_id}/candidates/${candidate.id}/details`}
                                    className="font-semibold underline text-primary hover:text-primary roboto-font"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <p className="font-semibold text-primary underline roboto-font">
                                      {renderHighlightedField(
                                        candidate.firstName,
                                        'firstName',
                                        highlightFilters
                                      )}{' '}
                                      {renderHighlightedField(
                                        candidate.lastName,
                                        'lastName',
                                        highlightFilters
                                      )}
                                    </p>
                                  </Link>
                                  <span className="mr-2">
                                    {collapsedCandidates.includes(candidate.id) ? (
                                      <UpOutlined />
                                    ) : (
                                      <DownOutlined />
                                    )}
                                  </span>
                                </div>
                              </div>

                              {collapsedCandidates.includes(candidate.id) && (
                                <div className="mt-3 bg-gray-50 rounded-md">
                                  {currentJobTitle ? (
                                    <div className="flex items-center gap-2 roboto-font">
                                      <span className="font-medium min-w-[70px]">Job Title:</span>
                                      <p className="roboto-font">
                                        {renderHighlightedField(
                                          currentJobTitle,
                                          'current_job_title',
                                          highlightFilters
                                        )}
                                      </p>
                                    </div>
                                  ) : (
                                    <span>N/A</span>
                                  )}
                                  <div className="flex items-center gap-2 roboto-font">
                                    <span className="font-medium min-w-[70px]">
                                      Qualification:{' '}
                                    </span>
                                    {candidate.education ? (
                                      <span>
                                        {renderHighlightedField(
                                          candidate.education,
                                          'education',
                                          highlightFilters
                                        )}
                                      </span>
                                    ) : (
                                      <span>N/A</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 roboto-font">
                                    <span className="font-medium min-w-[70px]">Email:</span>
                                    {candidate.emailId ? (
                                      <span>
                                        {renderHighlightedField(
                                          candidate.emailId,
                                          'emailId',
                                          highlightFilters
                                        )}
                                      </span>
                                    ) : (
                                      <span>N/A</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 roboto-font">
                                    <span className="font-medium min-w-[70px]">Phone:</span>
                                    {candidate.phoneNumber ? (
                                      <span>
                                        {renderHighlightedField(
                                          `${candidate.countryCode}${formatPhoneNumber(candidate.phoneNumber)}`,
                                          'phoneNumber',
                                          highlightFilters
                                        )}
                                      </span>
                                    ) : (
                                      <span>N/A</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 roboto-font">
                                    <span className="font-medium min-w-[70px]">Location: </span>
                                    {candidate.address ? (
                                      <span>
                                        {renderHighlightedField(
                                          candidate.address,
                                          'address',
                                          highlightFilters
                                        )}
                                      </span>
                                    ) : (
                                      <span>N/A</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Col>
                            <Col span={4}>
                              {atsScore !== undefined && atsScore !== null ? (
                                <p className="roboto-font">
                                  {renderHighlightedField(
                                    String(atsScore),
                                    'ats_score',
                                    highlightFilters
                                  )}
                                </p>
                              ) : (
                                <span>N/A</span>
                              )}
                            </Col>
                            <Col span={4}>
                              {jobTitle ? (
                                <p className="roboto-font">
                                  {renderHighlightedField(jobTitle, 'job_title', highlightFilters)}
                                </p>
                              ) : (
                                <span>N/A</span>
                              )}
                            </Col>
                            <Col span={4}>
                              {resumeExtracted ? (
                                <>
                                  <Link
                                    to={{
                                      pathname: `/jobs/view/${candidate.job_opening_id}/candidates/${candidate.id}/details`,
                                    }}
                                    state={{ activeTab: '3', atsScore: candidate?.atsScore }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <p
                                      className={
                                        !interviewExternalStatus
                                          ? 'cursor-pointer font-semibold'
                                          : undefined
                                      }
                                      style={{
                                        color: !interviewExternalStatus ? '#FFCC00' : undefined,
                                      }}
                                    >
                                      {renderHighlightedField(
                                        formatStatus(interviewExternalStatus) || 'N/A',
                                        'interview_external_status',
                                        highlightFilters
                                      )}
                                    </p>
                                  </Link>
                                  {interviewStatus &&
                                    (![
                                      'FINAL_ROUND_SHORTLISTED',
                                      'SELECTED',
                                      'NOT_SELECTED',
                                    ].includes(interviewStatus.toUpperCase()) ||
                                      candidate.isClosed) && (
                                      <p>
                                        {renderHighlightedField(
                                          interviewStatus || 'N/A',
                                          '',
                                          highlightFilters
                                        )}
                                      </p>
                                    )}
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Spin size="small" />
                                  <span className="text-gray-600">
                                    Resume Extraction is in Progress
                                  </span>
                                </div>
                              )}
                            </Col>
                            <Col span={4}>
                              <p className="roboto-font">
                                {renderHighlightedField(
                                  candidate.source,
                                  'source',
                                  highlightFilters
                                )}
                              </p>
                            </Col>
                          </Row>
                        </CommonCard>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {filteredCandidates.length > 0 && (
            <MasterPagination
              current={currentPage}
              pageSize={pageSize}
              total={totalItems}
              itemLabel="Candidates"
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </MainLayout>
    </>
  );
};

export default SearchCandidateListing;

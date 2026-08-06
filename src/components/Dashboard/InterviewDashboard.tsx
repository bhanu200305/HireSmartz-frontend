import { Select } from 'antd';
import InterviewClosureImage from '../../assets/svgs/interviewClosure.svg';
import { MdOutlineFilterAlt } from 'react-icons/md';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { monthlyOptions, yearlyOptions } from '../../shared/utils/business-logic';
import { formatEnumString } from '../../shared/utils/methods';
import { InterviewRounds, InterviewSummaryDashboardResponse } from '../../types';
import { Loader } from '../shared/ui/loader';
import { useGetAllRoundTypesQuery } from '../../api/job-service/Dashboard/JobOpening';
import EmptyChartImage from '../../assets/svgs/PieChartEmpty.svg';

type InterviewDashboardProps = {
  interviewData?: InterviewSummaryDashboardResponse;
  filters: {
    year: number;
    month: number;
    roundType: string | null;
  };
  isLoading: boolean;
  handleFilterChange: (field: 'month' | 'year' | 'roundType', value: number | string) => void;
  isOwner?: boolean;
};

const InterviewDashboard: React.FC<InterviewDashboardProps> = ({
  interviewData,
  filters,
  isLoading,
  handleFilterChange,
  isOwner = false,
}) => {
  const { allInterviews } = interviewData || {};
  const { interviewRounds } = interviewData || {};

  // const interviewRoundOptions =
  //   interviewRounds?.map((interview: InterviewRounds) => ({
  //     label: formatEnumString(interview.roundType),
  //     value: interview.roundType
  //   })) || []

  const { data: roundTypesData, isLoading: isRoundTypesLoading } = useGetAllRoundTypesQuery(
    isOwner,
    { refetchOnMountOrArgChange: true }
  );

  const interviewRoundOptions = Array.isArray(roundTypesData)
    ? roundTypesData.map((roundType: any) => ({
        label: formatEnumString(roundType.name),
        value: roundType.name,
      }))
    : [];
  const handleRoundData = (roundType: string) => {
    if (!roundType) {
      return {
        totalCandidates: allInterviews?.totalCandidates,
        totalCandidateEngage: allInterviews?.totalCandidateEngage,
        totalInterviews: allInterviews?.totalInterviews,
        totalJobPosted: allInterviews?.totalJobOpenings,
        selectedCandidates: allInterviews?.selectedCandidates,
        rejectedCandidates: allInterviews?.rejectedCandidates,
      };
    }
    const roundData = interviewRounds?.find(
      (interview: InterviewRounds) => interview.roundType === roundType
    );

    if (roundData) {
      return {
        totalCandidates: roundData?.totalCandidates,
        totalCandidateEngage: allInterviews?.totalCandidateEngage,
        totalInterviews: roundData?.totalInterviews,
        totalJobPosted: allInterviews?.totalJobOpenings,
        selectedCandidates: roundData?.selectedCandidates,
        rejectedCandidates: roundData?.rejectedCandidates,
      };
    }
    return;
  };

  const stats = handleRoundData(filters?.roundType ?? '');

  const selected = stats?.selectedCandidates ?? 0;
  const rejected = stats?.rejectedCandidates ?? 0;
  const total = selected + rejected;

  const chartData =
    total > 0
      ? [
          { name: 'Selected', value: (selected / total) * 100 },
          { name: 'Rejected', value: (rejected / total) * 100 },
        ]
      : [
          { name: 'Selected', value: 0 },
          { name: 'Rejected', value: 0 },
        ];

  return (
    <>
      {isLoading && <Loader />}
      <div
        className="bg-white rounded-xl p-4 w-full border"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex justify-between items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 flex items-center justify-center">
              <img src={InterviewClosureImage} alt="" />
            </div>
            <h2 className="text-xl font-medium heading-font">Interviews</h2>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <div className="border border-[var(--border)] p-1 rounded-3xl w-full flex items-center gap-1 bg-white">
                  <Select
                    dropdownStyle={{ minWidth: '100px' }}
                    prefix={
                      <MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />
                    }
                    style={{ width: '100px', fontSize: '14px' }}
                    placeholder="Year"
                    allowClear
                    className="w-full custom-select"
                    popupClassName="rounded-3xl"
                    value={filters?.year}
                    onChange={(value: number) => handleFilterChange('year', value)}
                  >
                    {yearlyOptions.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <div className="border border-[var(--border)] p-1 rounded-3xl w-full flex items-center gap-1 bg-white">
                  <Select
                    dropdownStyle={{ minWidth: '100px' }}
                    style={{ width: '100px', fontSize: '14px' }}
                    prefix={
                      <MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />
                    }
                    placeholder="Month"
                    allowClear
                    className="w-full custom-select"
                    popupClassName="rounded-3xl"
                    value={filters?.month}
                    onChange={(value: number) => handleFilterChange('month', value)}
                  >
                    {monthlyOptions.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <div className="border border-[var(--border)] p-1 rounded-3xl w-full flex items-center gap-1 bg-white">
                  <Select
                    dropdownStyle={{ minWidth: '100px' }}
                    style={{ width: '130px', fontSize: '14px' }}
                    prefix={
                      <MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />
                    }
                    placeholder="All Rounds"
                    allowClear
                    className="w-full custom-select"
                    popupClassName="rounded-3xl"
                    value={filters?.roundType}
                    onChange={(value: string) => handleFilterChange('roundType', value)}
                    options={interviewRoundOptions}
                    loading={isRoundTypesLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-row max-h-[400px] max-w-full">
          <div className="space-y-4 pl-2">
            <div>
              <p className="text-xl font-semibold text-primary heading-font">
                {stats?.totalJobPosted ?? 0}
              </p>
              <p className="text-sm border-b pb-2 w-35" style={{ borderColor: 'var(--border)' }}>
                Total Jobs Posted
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-primary heading-font">
                {stats?.totalInterviews ?? 0}
              </p>
              <p className="text-sm border-b pb-2 w-35" style={{ borderColor: 'var(--border)' }}>
                Completed Interviews
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-primary heading-font">
                {allInterviews?.totalCandidates ?? 0}
              </p>
              <p className="text-sm border-b pb-2 w-35" style={{ borderColor: 'var(--border)' }}>
                Candidates Applied
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-primary heading-font">
                {stats?.totalCandidateEngage ?? 0}
              </p>
              <p className="text-sm border-b pb-2 w-35" style={{ borderColor: 'var(--border)' }}>
                Candidates Engaged
              </p>
            </div>
          </div>
          {interviewData && interviewData?.interviewRounds?.length > 0 && total > 0 ? (
            <div className="flex justify-center flex-grow relative">
              <ResponsiveContainer minWidth={300} minHeight={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    innerRadius={90}
                    outerRadius={120}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#34D399' : '#F87171'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#34D399]"></div>
                  <div className="text-center">
                    <p>Selected: {stats?.selectedCandidates ?? 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#F87171]"></div>
                  <div className="text-center">
                    <p>Rejected: {stats?.rejectedCandidates ?? 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center flex-grow flex-col ml-12">
              <img src={EmptyChartImage} alt="No data available" className="w-50 h-50" />
              <p className="text-gray-400 text-md mt-4">
                Pie chart data not available for selected filters
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InterviewDashboard;

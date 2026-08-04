import React from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useGetCandidateApplicationsQuery } from '../../../api/candidate-service/Candidates/AssignJobOpening';
import type { CandidateApplication } from '../../../api/candidate-service/Candidates/AssignJobOpening';
import { formattedDate } from '../../../shared/utils/methods';
import { Loader } from '../../shared/ui/loader';

type CandidateApplicationsProps = {
  candidateId: number;
};

const STATUS_COLOR_MAP: Record<string, string> = {
  IN_PROCESS: 'blue',
  SELECTED: 'green',
  NOT_SELECTED: 'red',
  DECISION_PENDING: 'purple',
  ADVANCED: 'cyan',
  REVIEW_AWAITED: 'orange',
};

const formatApplicationStatus = (status: string): string => {
  if (!status) return 'N/A';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const CandidateApplications: React.FC<CandidateApplicationsProps> = ({ candidateId }) => {
  const { data, isLoading, isError } = useGetCandidateApplicationsQuery(
    { candidateId },
    { skip: !candidateId }
  );

  const applications: CandidateApplication[] = data?.data ?? [];

  const columns: ColumnsType<CandidateApplication> = [
    {
      title: 'Job Title',
      dataIndex: 'jobTitle',
      key: 'jobTitle',
      render: (title: string, record) => (
        <div>
          <span className="font-medium text-gray-800">{title || 'N/A'}</span>
          {record.jobProfileCode && (
            <span className="ml-1 text-xs text-gray-400">({record.jobProfileCode})</span>
          )}
        </div>
      ),
    },
    {
      title: 'Application Status',
      dataIndex: 'applicationStatus',
      key: 'applicationStatus',
      render: (status: string) => {
        const normalizedStatus = (status ?? '').toUpperCase();
        const color = STATUS_COLOR_MAP[normalizedStatus] ?? 'default';
        return <Tag color={color}>{formatApplicationStatus(status)}</Tag>;
      },
    },
    {
      title: 'Candidate Score',
      dataIndex: 'candidateScore',
      key: 'candidateScore',
      align: 'center',
      render: (score: number | null) =>
        score != null ? (
          <span className="font-medium text-primary">{score}/5</span>
        ) : (
          <span className="text-gray-400">N/A</span>
        ),
    },
    {
      title: 'Applied Date',
      dataIndex: 'appliedDate',
      key: 'appliedDate',
      render: (date: string) => (
        <span className="text-gray-600">{date ? formattedDate(date) : 'N/A'}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-red-500 text-sm font-medium">
          Failed to load applications. Please try again.
        </p>
      </div>
    );
  }

  if (!isLoading && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray-400 text-sm">No job applications found for this candidate.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Table<CandidateApplication>
        columns={columns}
        dataSource={applications}
        rowKey={(record) => `${record.jobOpeningId}-${record.appliedDate}`}
        pagination={false}
        size="middle"
        className="rounded-lg overflow-hidden"
        bordered={false}
      />
    </div>
  );
};

export default CandidateApplications;

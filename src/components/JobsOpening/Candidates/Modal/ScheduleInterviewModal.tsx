import React, { useEffect, useRef } from 'react';
import { Modal, Select } from 'antd';
import { Input } from '../../../shared';

import { InterviewRoundResponseDTO, OptionType } from '../../../../types';
import { useFetchAllMembersQuery } from '../../../../api/candidate-service/Candidates/Candidates';
import { slotOptions } from '../../../../shared/utils/business-logic';
import { formatEnumString } from '../../../../shared/utils/methods';
import { Textarea } from '../../../shared/ui/textarea';

type ScheduleInterviewProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  interviewRecord: InterviewRoundResponseDTO;
  interviewerData: InterviewerDataType;
  setInterviewerData: React.Dispatch<React.SetStateAction<InterviewerDataType>>;
  onDataChange: React.Dispatch<React.SetStateAction<InterviewerDataType>>;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  isEditMode?: boolean;
};

type InterviewerDataType = {
  interviewerName: string[];
  interviewSlotDuration?: number;
  interviewerIds?: string[];
  // interviewDate?: string,
  // interviewTime?: string,
  interviewLocation?: string;
};

const ScheduleInterviewModal: React.FC<ScheduleInterviewProps> = ({
  visible,
  onClose,
  title,
  footer,
  interviewRecord,
  interviewerData,
  setInterviewerData,
  onDataChange,
}) => {
  const { roundType } = interviewRecord;
  const { data, refetch } = useFetchAllMembersQuery();
  const selectRef = useRef<any>(null);

  useEffect(() => {
    if (interviewRecord) {
      refetch();
    }
  }, [interviewRecord, refetch]);

  const options: OptionType[] =
    data?.map((member) => ({
      label: member.name,
      value: member.userId,
    })) || [];

  const handleInterviewerChange = (values: number[]) => {
    const updatedValues = {
      ...interviewerData,
      interviewerName: values.map(String),
      interviewerIds: values.map(String),
    };

    if (selectRef.current) {
      selectRef.current.blur();
    }

    setInterviewerData(updatedValues);
    onDataChange(updatedValues);
  };

  const handleSlotDurationChange = (value: number) => {
    const updatedValues = {
      ...interviewerData,
      interviewSlotDuration: value,
    };
    setInterviewerData(updatedValues);
    onDataChange(updatedValues);
  };
  const handleLocationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    const updatedValues = {
      ...interviewerData,
      interviewLocation: value,
    };
    setInterviewerData(updatedValues);
    onDataChange(updatedValues);
  };

  return (
    <div>
      <Modal
        open={visible}
        onCancel={onClose}
        footer={footer}
        centered
        maskClosable={false}
        keyboard={false}
        width="50%"
        className="custom-modal"
      >
        <h2 className="text-2xl font-semibold text-center mb-5">{title}</h2>
        {roundType === 'VIDEO' && title === 'Schedule Interview' ? (
          <div className="flex justify-center mb-4">
            <span className="text-sm font-bold">Note:</span>
            <h6 className="text-sm ml-1">
              After scheduling the candidate will receive a link to book an interview slot via
              email.
            </h6>
          </div>
        ) : null}
        <div className="flex flex-col justify-start gap-2">
          <div>
            <label className="text-sm capitalize">Interview Name</label>
            <Input
              value={`${formatEnumString(roundType) ?? ''} Interview`}
              className="text-[var(--border)] w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              disabled
            />
          </div>

          <div>
            <label className="text-sm capitalize">Candidate Name</label>
            <Input
              value={`${interviewRecord?.firstName ?? ''} ${interviewRecord?.lastName ?? ''}`}
              className="text-[var(--border)] w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              disabled
            />
          </div>

          <div>
            <label className="text-sm ">
              {title === 'Update Interviewer' ? 'Interviewer(s) Name' : 'Interviewer Name'}
            </label>
            <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
              <Select<number[]>
                className="w-full custom-select-jobs placeholder-style"
                ref={selectRef}
                mode="multiple"
                allowClear
                placeholder="Select Interviewer"
                value={(interviewerData.interviewerIds || []).map(Number)}
                onChange={handleInterviewerChange}
                options={options}
              />
            </div>
          </div>

          <div>
            <label className="text-sm capitalize">Slot Duration</label>
            <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
              <Select
                className="w-full custom-select-jobs placeholder-style"
                allowClear
                placeholder="Select Slot Duration"
                value={interviewerData.interviewSlotDuration}
                onChange={handleSlotDurationChange}
                options={slotOptions}
                disabled={title === 'Update Interviewer'}
              />
            </div>
          </div>
          {roundType === 'IN_PERSON' ? (
            <div>
              <div>
                <label className="text-sm capitalize">Location Details</label>
                <Textarea
                  rows={4}
                  className="w-full p-3 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-gray-300"
                  placeholder="Enter Location Details"
                  onChange={handleLocationChange}
                  value={interviewerData.interviewLocation}
                  disabled={title === 'Update Interviewer'}
                />
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default ScheduleInterviewModal;

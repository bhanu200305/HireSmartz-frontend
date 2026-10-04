import React, { useState } from 'react';
import { DatePicker, Dropdown, TimePicker } from 'antd';
import { Button, showToast } from '..';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { GoClock } from 'react-icons/go';
import dayjs, { Dayjs } from 'dayjs';
import { DateTimeRange } from '../../../types';

type DateTimeProps = {
  className?: string;
  value?: DateTimeRange;
  onApply: (range: { startDateTime: string; endDateTime: string }) => void;
  onReset?: () => void;
};

const DateTimeRangePicker: React.FC<DateTimeProps> = ({ value, onApply, onReset }) => {
  const startDefaultTimeStamp = 'T00:00:00+05:30';
  const endDefaultTimeStamp = 'T23:59:59+05:30';
  const [showDropdown, setShowDropdown] = useState(false);
  const [range, setRange] = useState<DateTimeRange>(() => {
    if (!value) {
      return {
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
      };
    }

    const shouldResetTime = (time: string) => {
      if (!time) return true;
      const normalizedTime = time.toLowerCase().trim();
      return (
        normalizedTime === '00:00:00' ||
        normalizedTime === '12:00:00 am' ||
        normalizedTime === '12:00:00'
      );
    };

    return {
      startDate: value.startDate || '',
      startTime: shouldResetTime(value.startTime || '') ? '' : value.startTime || '',
      endDate: value.endDate || '',
      endTime: shouldResetTime(value.endTime || '') ? '' : value.endTime || '',
    };
  });

  const handleApply = () => {
    const toApiStartDateTime = (date: string, time: string) => {
      return date && time
        ? `${date}T${time}+05:30`
        : date && !time
          ? `${date}${startDefaultTimeStamp}`
          : '';
    };

    // For end datetime, when user doesn't pick a time, treat it as end-of-day so the range is inclusive.
    const toApiEndDateTime = (date: string, time: string) => {
      return date && time
        ? `${date}T${time}+05:30`
        : date && !time
          ? `${date}${endDefaultTimeStamp}`
          : '';
    };

    const startDateTime = toApiStartDateTime(range.startDate, range.startTime);
    const endDateTime = toApiEndDateTime(range.endDate, range.endTime);

    const start = dayjs(startDateTime);
    const end = dayjs(endDateTime);

    if (end.isBefore(start)) {
      showToast({
        message: 'End time must be after start time for the same date',
        type: 'error',
      });
      return;
    }

    onApply({ startDateTime, endDateTime });
    setShowDropdown(false);
  };

  const handleReset = () => {
    setRange({
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
    });
    onReset?.();
    setShowDropdown(false);
  };

  const dropdownContent = (
    <div className="mt-2 bg-white rounded-xl w-100 p-4 shadow-md">
      <div className="-mx-4 px-4 border-b border-[var(--border)] py-1.5">
        <div className="flex flex-row justify-between text-center items-center">
          <span className="text-sm">Start Date</span>
          <div className="rounded-md border border-[var(--border)] p-2 w-65">
            <DatePicker
              variant="borderless"
              className="w-full custom-date-picker placeholder-style"
              format="MMM D, YYYY"
              placeholder="Select Start Date"
              value={range.startDate ? dayjs(range.startDate) : null}
              onChange={(date: Dayjs | null) =>
                setRange({ ...range, startDate: date ? date?.format('YYYY-MM-DD') : '' })
              }
              // disabledDate={(current) =>
              //   !!range.endDate &&
              //   current &&
              //   current.isAfter(dayjs(range.endDate, 'YYYY-MM-DD'), 'day')
              // }
              disabledDate={(current) => {
                if (current && current.isAfter(dayjs(), 'day')) {
                  return true;
                }
                if (
                  !!range.endDate &&
                  current &&
                  current.isAfter(dayjs(range.endDate, 'YYYY-MM-DD'), 'day')
                ) {
                  return true;
                }

                return false;
              }}
            />
          </div>
        </div>
      </div>
      <div className="-mx-4 px-4 border-b border-gray-300 py-1.5">
        <div className="flex flex-row justify-between text-center items-center">
          <span className="text-sm">Start Time</span>
          <div className="rounded-md border border-[var(--border)] p-2 w-65 mt-2">
            <TimePicker
              variant="borderless"
              className="w-full custom-date-picker placeholder-style"
              placeholder="Select Start Time"
              use12Hours
              format="h:mm:ss A"
              value={range.startTime ? dayjs(range.startTime, 'HH:mm:ss') : null}
              onChange={(time: Dayjs | null) =>
                setRange({
                  ...range,
                  startTime: time ? time.format('HH:mm:ss') : '',
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="-mx-4 px-4 border-b border-gray-300 py-1.5">
        <div className="flex flex-row justify-between text-center items-center">
          <span className="text-sm">End Date</span>
          <div className="rounded-md border border-[var(--border)] p-2 w-65 mt-2">
            <DatePicker
              variant="borderless"
              className="w-full custom-date-picker placeholder-style"
              format="MMM D, YYYY"
              placeholder="Select End Date"
              value={range.endDate ? dayjs(range.endDate) : null}
              onChange={(date: Dayjs | null) =>
                setRange({ ...range, endDate: date ? date?.format('YYYY-MM-DD') : '' })
              }
              // disabledDate={(current) =>
              //   !!range.startDate &&
              //   current &&
              //   current.isBefore(dayjs(range.startDate, 'YYYY-MM-DD'), 'day')
              // }
              disabledDate={(current) => {
                if (current && current.isAfter(dayjs(), 'day')) {
                  return true;
                }
                if (
                  range.startDate &&
                  current &&
                  current.isBefore(dayjs(range.startDate, 'YYYY-MM-DD'), 'day')
                ) {
                  return true;
                }

                return false;
              }}
            />
          </div>
        </div>
      </div>

      <div className="-mx-4 px-4 border-b border-gray-300 py-1.5">
        <div className="flex flex-row justify-between text-center items-center">
          <span className="text-sm">End Time</span>
          <div className="rounded-md border border-[var(--border)] p-2 w-65 mt-2">
            <TimePicker
              variant="borderless"
              className="w-full custom-date-picker placeholder-style"
              placeholder="Select End Time"
              use12Hours
              format="h:mm:ss A"
              value={range.endTime ? dayjs(range.endTime, 'HH:mm:ss') : null}
              onChange={(time: Dayjs | null) =>
                setRange({
                  ...range,
                  endTime: time ? time.format('HH:mm:ss') : '',
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 pt-4">
        <Button
          className="font-bold border border-gray-300 rounded-full px-7 py-3"
          onClick={handleReset}
        >
          Reset
        </Button>
        <Button
          className="px-10 py-3 bg-primary font-bold text-white border rounded-4xl cursor-pointer"
          onClick={handleApply}
          disabled={!range?.startDate || !range?.endDate}
        >
          Apply
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <Dropdown
        open={showDropdown}
        onOpenChange={setShowDropdown}
        dropdownRender={() => dropdownContent}
        trigger={['click']}
        placement="bottomRight"
      >
        <div
          className="cfp-dropdown-trigger cursor-pointer"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <GoClock className="cfp-dropdown-filter-icon" />
          <span className="text-sm whitespace-nowrap text-gray-800">Date - Time</span>
          {showDropdown ? (
            <FaChevronUp className="text-gray-800 text-xs ml-auto" />
          ) : (
            <FaChevronDown className="text-gray-800 text-xs ml-auto" />
          )}
        </div>
      </Dropdown>
    </div>
  );
};

export default DateTimeRangePicker;

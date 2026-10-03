import { useState, useEffect } from 'react';
import { Calendar, Card, Select, Alert, Radio } from 'antd';
import { ClockCircleOutlined, GlobalOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import './AiCallBooking.css';

dayjs.extend(utc);
dayjs.extend(timezone);

const { Option } = Select;

type TimeSlot = {
  id: string;
  time: string;
  displayTime: string;
};

type BookingData = {
  selectedDate: any;
  selectedTime: string;
  selectedTimezone: string;
};

type TimeFormat = '12h' | '24h';

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

const AiCallBooking = () => {
  const [bookingData, setBookingData] = useState<BookingData>({
    selectedDate: dayjs(),
    selectedTime: '',
    selectedTimezone: 'Asia/Kolkata',
  });

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Generate time slots in 15-min intervals for full day, skipping past slots if today
  const generateTimeSlots = (format: TimeFormat, selectedDate: any): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    let startTime = dayjs().tz(bookingData.selectedTimezone).startOf('day');
    const endTime = dayjs().tz(bookingData.selectedTimezone).endOf('day');
    const now = dayjs().tz(bookingData.selectedTimezone);
    const isToday = selectedDate?.isSame(now, 'day');

    // If it's today, start from current time + 30 minutes
    if (isToday) {
      startTime = now.add(30, 'minute').startOf('minute');
      // Round up to the next 15-minute interval
      const minutesToAdd = 15 - (startTime.minute() % 15);
      startTime = startTime.add(minutesToAdd, 'minute');
    }

    while (startTime.isBefore(endTime)) {
      const timeValue = startTime.format('HH:mm');
      const displayTime = format === '12h' ? startTime.format('h:mm A') : startTime.format('HH:mm');
      slots.push({
        id: timeValue,
        time: timeValue,
        displayTime,
      });
      startTime = startTime.add(15, 'minute');
    }
    return slots;
  };

  useEffect(() => {
    setTimeSlots(generateTimeSlots(timeFormat, bookingData.selectedDate));
  }, [timeFormat, bookingData.selectedDate, bookingData.selectedTimezone]);

  const onDateSelect = (value: any) => {
    setBookingData({
      ...bookingData,
      selectedDate: value,
      selectedTime: '',
    });
    setIsConfirmed(false);
  };

  const onTimeSelect = (time: string) => {
    setBookingData({
      ...bookingData,
      selectedTime: time,
    });
  };

  const onTimezoneChange = (value: string) => {
    setBookingData({
      ...bookingData,
      selectedTimezone: value,
    });
  };

  const onTimeFormatChange = (e: any) => {
    setTimeFormat(e.target.value);
  };

  const onSchedule = () => {
    if (bookingData.selectedDate && bookingData.selectedTime) {
      setIsConfirmed(true);
      // Here, trigger API/booking logic if needed
    }
  };

  const isScheduleDisabled = !bookingData.selectedDate || !bookingData.selectedTime;

  const formatTimeForDisplay = (time: string, format: TimeFormat): string => {
    const [hours, minutes] = time.split(':');
    const timeObj = dayjs().set('hour', parseInt(hours)).set('minute', parseInt(minutes));
    return format === '12h' ? timeObj.format('h:mm A') : timeObj.format('HH:mm');
  };

  // Custom header for the calendar
  const headerRender = ({ value, onChange }: { value: any; onChange: (date: any) => void }) => {
    const current = value;
    const monthOptions = [];
    for (let i = 0; i < 12; i++) {
      monthOptions.push(
        <Option key={i} value={i} className="month-item">
          {dayjs().month(i).format('MMMM')}
        </Option>
      );
    }
    const year = current.year();
    const month = current.month();
    const options = [];
    for (let i = year - 1; i < year + 2; i += 1) {
      options.push(
        <Option key={i} value={i} className="year-item">
          {i}
        </Option>
      );
    }
    return (
      <div className="flex justify-between items-center p-2 border-b">
        <div className="flex items-center space-x-4 gap-2">
          <Select
            size="large"
            className="width-full"
            value={month}
            onChange={(newMonth) => {
              const now = current.month(newMonth);
              onChange(now);
            }}
          >
            {monthOptions}
          </Select>
          <Select
            size="large"
            className="width-full"
            value={year}
            onChange={(newYear) => {
              const now = current.year(newYear);
              onChange(now);
            }}
          >
            {options}
          </Select>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Careerforce Pro</h1>
          <p className="text-gray-600">AI-Powered Recruitment Platform</p>
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Timezone & Format Controls */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg rounded-xl border-0 h-full">
              <div className="flex items-center mb-4">
                <GlobalOutlined className="text-primary text-xl mr-2" />
                <h3 className="text-md font-semibold text-gray-800">Time Zone</h3>
              </div>
              <Select
                value={bookingData.selectedTimezone}
                onChange={onTimezoneChange}
                className="w-full"
                size="large"
                popupMatchSelectWidth={false}
                showSearch
                optionFilterProp="children"
              >
                {timezones.map((tz) => (
                  <Option key={tz} value={tz}>
                    {tz.replace('_', ' ')} ({dayjs().tz(tz).format('Z')})
                  </Option>
                ))}
              </Select>
              <div className="mt-4">
                <div className="flex items-center mb-2">
                  <ClockCircleOutlined className="text-primary text-md mr-2" />
                  <h3 className="text-md font-semibold text-gray-800">Time Format</h3>
                </div>
                <Radio.Group
                  value={timeFormat}
                  onChange={onTimeFormatChange}
                  className="w-full"
                  optionType="button"
                  buttonStyle="solid"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Radio.Button
                      value="12h"
                      className={`text-center ${timeFormat === '12h' ? '!bg-primary !text-white !border-primary' : 'bg-gray-100'}`}
                    >
                      12
                    </Radio.Button>
                    <Radio.Button
                      value="24h"
                      className={`text-center ${timeFormat === '24h' ? '!bg-primary !text-white !border-primary' : 'bg-gray-100'}`}
                    >
                      24
                    </Radio.Button>
                  </div>
                </Radio.Group>
              </div>
            </Card>
          </div>

          {/* Calendar Section - Bigger and centered */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg rounded-xl border-0 h-full">
              <div className="flex items-center mb-4">
                <CalendarOutlined className="text-primary text-xl mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">
                  {bookingData.selectedDate
                    ? bookingData.selectedDate.format('MMMM YYYY')
                    : 'Select Date'}
                </h2>
              </div>
              <Calendar
                fullscreen={false}
                onSelect={onDateSelect}
                value={bookingData.selectedDate ?? undefined}
                className="rounded-lg custom-calendar"
                headerRender={headerRender}
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Card>
          </div>

          {/* Time Slots Section */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg rounded-xl border-0 h-full">
              <div className="flex items-center mb-4">
                <ClockCircleOutlined className="text-primary text-xl mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">
                  {bookingData.selectedDate
                    ? bookingData.selectedDate.format('D ddd')
                    : 'Select a Date'}
                </h2>
              </div>
              {bookingData.selectedDate ? (
                <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                  <div className="grid grid-cols-1 gap-3 p-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        className={`h-12 px-4 rounded-xl font-medium transition cursor-pointer
                          ${
                            bookingData.selectedTime === slot.time
                              ? 'bg-primary text-white border-primary border'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-primary border'
                          }`}
                        onClick={() => onTimeSelect(slot.time)}
                      >
                        {slot.displayTime}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <ClockCircleOutlined className="text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-500">Please select a date to see available time slots</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Schedule Button and Confirmation */}
        <div className="flex justify-center pt-2">
          <div className="text-center">
            <button
              className={`text-white bg-primary rounded-3xl px-6 py-3 text-md font-medium ${isScheduleDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-700'}`}
              disabled={isScheduleDisabled}
              onClick={onSchedule}
            >
              Schedule Interview
            </button>

            {isConfirmed && (
              <Alert
                message="Interview Confirmed!"
                description={`Your video interview has been scheduled for ${bookingData.selectedDate?.format('MMMM D, YYYY')} at ${formatTimeForDisplay(bookingData.selectedTime, timeFormat)} (${bookingData.selectedTimezone}).`}
                type="success"
                showIcon
                className="mt-6 rounded-lg max-w-2xl"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCallBooking;

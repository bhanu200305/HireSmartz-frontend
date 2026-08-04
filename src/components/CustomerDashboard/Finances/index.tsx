import { useState } from 'react';
import { CommonCard, Search } from '../..';
import { Col, Row, Select, Switch } from 'antd';
import { DownOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { IoMdNotificationsOutline } from 'react-icons/io';
import MainLayout from '../../../layouts/MainLayout';
import { HiOutlineCash } from 'react-icons/hi';
import '../customerPage.css';
import { MdOutlineFilterAlt, MdAccessTime } from 'react-icons/md';
import MasterPagination from '../../shared/ui/MasterPagination';
import { FaArrowTrendUp } from 'react-icons/fa6';
import paymentsData from './dummyData.json';
import ComingSoon from '../../../assets/svgs/ComingSoon.svg';

const { Option } = Select;

const PAGE_SIZE = 10;

const FinancesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<string | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>();
  const [paymentStage, setPaymentStage] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = PAGE_SIZE;

  const filteredData = paymentsData.payments.filter((payment: any) =>
    payment.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginate data
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleStatusChange = () => {};
  return (
    <div>
      <MainLayout>
        <div className="w-full p-8 justify-start pt-18">
          <div className="flex items-center space-x-2 mb-12">
            <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
              <HiOutlineCash size={18} />
            </span>
            <h2 className="text-xl font-semibold">Finances</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4">
              <img src={ComingSoon} alt="Coming Soon" className="w-50 h-50" />
            </div>
            <p className="text-lg text-gray-400">COMING SOON</p>
          </div>
        </div>
      </MainLayout>
    </div>
  );
};

export default FinancesPage;

import { useState } from 'react';
import { Button, Search } from '../..';
import { Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BsCalendar4Event } from 'react-icons/bs';
import MainLayout from '../../../layouts/MainLayout';
import '../customerPage.css';
import { useNavigate } from 'react-router-dom';
import ComingSoon from '../../../assets/svgs/ComingSoon.svg';

const { Option } = Select;

const packages = [
  {
    id: 1,
    name: 'Pro',
    price: '$499',
    features: ['Feature 1', 'Feature 2'],
  },
  {
    id: 2,
    name: 'Premium',
    price: '$400',
    features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'],
  },
  {
    id: 3,
    name: 'Enterprise',
    price: '$599',
    features: ['Feature 1'],
  },
];

const SubscriptionPage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <MainLayout>
        <div className="w-full p-8 justify-start pt-18">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center space-x-2">
              <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                <BsCalendar4Event size={18} />
              </span>
              <h2 className="text-xl font-semibold">Subscriptions</h2>
            </div>

            {/* <div className="flex space-x-4">
              <Button
                className="text-black border border-[#1976D2] bg-white rounded-3xl px-4 py-2 flex items-center space-x-2"
                onClick={() => navigate('/update-package')}
              >
                <PlusOutlined className="text-lg" /> <span>UPDATE PACKAGE</span>
              </Button>
              <Button
                className="text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2"
                onClick={() => navigate('/add-new-package')}
              >
                <PlusOutlined className="text-lg" /> <span>ADD PACKAGE</span>
              </Button>
            </div>
          </div> */}

            {/* Subscription Cards */}
            {/* <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '40px',
              flexWrap: 'wrap',
            }}
          >
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  border: '2px solid #007bff',
                  borderRadius: '16px',
                  padding: '60px 20px 24px',
                  width: '240px',
                  textAlign: 'center',
                  position: 'relative',
                  backgroundColor: '#fff',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                }}
              > */}
            {/* Number Circle */}
            {/* <div
                  style={{
                    position: 'absolute',
                    top: '-38px',
                    left: 'calc(50% - 38px)',
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 4px rgba(0, 123, 255, 0.3)',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: '#007bff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        color: '#007bff',
                      }}
                    >
                      {pkg.id}
                    </div>
                  </div>
                </div> */}

            {/* Price */}
            {/* <p
                  style={{
                    color: '#007bff',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    marginTop: '-20px',
                    marginBottom: '10px',
                  }}
                >
                  {pkg.price}
                </p> */}

            {/* Name */}
            {/* <h3 style={{ fontSize: '20px', fontWeight: 600 }}>{pkg.name}</h3> */}

            {/* Features */}
            {/* <ul
                  style={{
                    marginTop: '16px',
                    listStyleType: 'decimal',
                    textAlign: 'left',
                    paddingLeft: '20px',
                    fontSize: '14px',
                    lineHeight: '1.8',
                    minHeight: '100px',
                  }}
                >
                  {pkg.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul> */}
            {/* </div>
            ))} */}
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

export default SubscriptionPage;

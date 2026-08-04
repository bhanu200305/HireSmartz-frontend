import { Select } from 'antd';
import upcomingRevenueImage from '../../assets/svgs/upcomingRevenue.svg';
import ComingSoon from '../../assets/svgs/ComingSoon.svg';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

const UpcomingRevenue = () => {
  // const navigate = useNavigate()
  // const series = [
  //   {
  //     name: 'Series 1',
  //     data: [
  //       { category: 'Jan', value: 20 },
  //       { category: 'Feb', value: 20 }
  //     ]
  //   }
  // ]
  // const handleIconClick = () => {
  //   navigate('/finances')
  // }

  return (
    <div className="bg-gray-50 rounded-xl shadow p-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-13 h-13 flex items-center justify-center`}
            // onClick={handleIconClick}
          >
            <img src={upcomingRevenueImage} />
          </div>
          <Link to="/finances" className="text-xl font-medium text-primary">
            <h2 className="text-xl font-medium hover:underline hover:text-primary text-black">
              Predicted Upcoming Revenue
            </h2>
          </Link>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4">
          <img src={ComingSoon} alt="Coming Soon" className="w-50 h-50" />
        </div>
        <p className="text-md text-gray-400">COMING SOON</p>
      </div>
      {/* <div className="flex flex-row max-h-[400px] max-w-full">
        <div className="w-48 pr-4 relative">
          <div className="absolute text-left top-8">
            <p className="text-lg font-bold">$7K</p>
            <p className="text-sm border-b border-gray-300 pb-1">January</p>
          </div>
          <div className="absolute text-left bottom-25">
            <p className="text-lg font-bold text-blue-400">$40K</p>
            <p className="text-sm text-blue-400 border-b-2 border-blue-500 pb-1">February</p>
          </div>
        </div>
        <div className="flex justify-center flex-grow relative">
          <LineChart width={500} height={300}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" type="category" allowDuplicatedCategory={false} />
            <YAxis
              domain={[0, 2.5]}
              ticks={[0, 10, 20, 30, 40, 50]}
              tickFormatter={(value: any) => (value > 0 ? `${value}k` : value)}
              dataKey="value"
            />
            <Tooltip />
            <Legend />
            {series.map((s) => (
              <Line dataKey="value" data={s.data} />
            ))}
          </LineChart>
        </div>
      </div> */}

      {/* <div className="relative text-right mt-4 pr-6">
        <button className="text-primary font-bold underline relative cursor-pointer">VIEW MORE
          <span className="absolute no-underline ml-1.5">→</span>
        </button>
      </div> */}
    </div>
  );
};

export default UpcomingRevenue;

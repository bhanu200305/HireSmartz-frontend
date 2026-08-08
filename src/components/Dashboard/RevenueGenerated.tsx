import revenueGeneratedImage from '../../assets/svgs/revenueGenerated.svg';
import { Link } from 'react-router-dom';
import ComingSoon from '../../assets/svgs/ComingSoon.svg';

const RevenueGenerated = () => {
  return (
    <div
      className="bg-white rounded-xl p-6 w-full border shadow-xs"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary-50">
            <img src={revenueGeneratedImage} alt="" className="w-6 h-6 object-contain" />
          </div>
          <Link to="/finances" className="transition-colors hover:text-primary">
            <h2 className="font-display text-lg font-semibold text-neutral-900">
              Revenue Generated
            </h2>
          </Link>
        </div>

        {/* <div className="flex justify-between items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="border border-[var(--border)] p-1 rounded-3xl w-35 flex items-center gap-1 bg-white">
                <MdOutlineFilterAlt className={`ml-3 text-lg text-primary`} />
                <Select
                  placeholder="Monthly"
                  allowClear
                  className="w-full custom-select"
                  popupClassName="rounded-3xl"
                >
                  <Option value="Option 1">Option 1</Option>
                  <Option value="Option 2">Option 2</Option>
                </Select>
              </div>
            </div>
          </div>
        </div> */}
      </div>
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4">
          <img src={ComingSoon} alt="Coming Soon" className="w-50 h-50" />
        </div>
        <p className="text-xs font-semibold tracking-widest text-neutral-400">COMING SOON</p>
      </div>

      {/* <div className="flex flex-row max-h-[400px] max-w-full"> */}
      {/* <div className="flex gap-2 flex-grow relative "> */}
      {/* <BarChart width={500} height={300} data={data} margin={{}}> */}
      {/* <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={({ x, y, payload }: any) => {
                return (
                  <text
                    x={x + 10} // ← shift left
                    y={y + 4}
                    textAnchor="end"
                    className="text-sm"
                  >
                    {payload.value}
                  </text>
                )
              }}
              label={{
                value: 'Months',
                position: 'insideLeft',
                offset: 0,
                style: { fill: '#000000', fontSize: 14, fontWeight: 500 }
              }}
            />
            <YAxis
              domain={[0, 2.5]}
              ticks={[0, 0.5, 1.0, 1.5, 2.0, 2.5]}
              tickFormatter={(value) => (value > 0 ? `${value}M` : value)}
              tick={({ x, y, payload }) => {
                return (
                  <text
                    x={x - 1} // ← shift left
                    y={y + 4}
                    textAnchor="end"
                    className="text-sm"
                  >
                    {payload.value > 0 ? `${payload.value}M` : payload.value}
                  </text>
                )
              }}
              label={{
                value: 'Amount in USD($)',
                angle: -90,
                position: 'insideRight',
                offset: 10,
                style: { fill: '#000000', fontSize: 14, fontWeight: 500 }
              }}
            /> */}
      {/* <Bar dataKey="amount" fill="#2B934E"> */}
      {/* {data.map((entry, index) => (
                <Cell key={`cell-${index}`} />
              ))} */}
      {/* </Bar> */}
      {/* </BarChart> */}
      {/* </div> */}
      {/* </div> */}

      {/* <div className="relative text-right mt-4 pr-6">
        <button className="text-primary font-bold underline relative cursor-pointer">VIEW MORE
          <span className="absolute no-underline ml-1.5">→</span>
        </button>
      </div> */}
    </div>
  );
};

export default RevenueGenerated;

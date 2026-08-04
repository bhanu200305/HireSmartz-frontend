// import { useNavigate } from 'react-router-dom'
// import { MdOutlineArrowBack } from 'react-icons/md'
// import MainLayout from '../../../MainLayout'
// import { useState } from 'react'
// import { DownOutlined } from '@ant-design/icons'
// import { Dropdown } from 'antd'
// import { useGetAllAtsNamesByCompanyIdQuery } from '../../../api/job-service/AtsJobDetails/AtsJobDetails'
// import { Loader } from '../../shared/ui/loader'

// const AtsJobDetails = () => {
//   const navigate = useNavigate()
//   const [selectedATS, setSelectedATS] = useState('')

//   const { data, isLoading } = useGetAllAtsNamesByCompanyIdQuery({})

//   type Provider = { name: string }

//   const atsOptions =
//     data?.data?.map((provider: Provider) => ({
//       key: provider.name,
//       label: provider.name
//     })) || []

//   return (
//     <MainLayout>
//       {isLoading && <Loader />}
//       <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-16">
//         <div className="mb-4 self-start px-4 absolute">
//           <button
//             onClick={() => navigate(-1)}
//             className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
//           >
//             <MdOutlineArrowBack className="mr-2" />
//             <span>Back</span>
//           </button>
//         </div>

//         <div
//           className="bg-[#FAFAFA] p-6 md:p-10 rounded-2xl shadow-lg w-full max-w-4xl flex flex-col items-center justify-center"
//           style={{ height: 'calc(100vh - 200px)' }}
//         >
//           <div className="bg-white p-6 md:p-10 rounded-2xl shadow-md w-full max-w-md flex flex-col items-center">
//             <h3 className="text-lg font-semibold mb-4">Upload from ATS</h3>

//             <label className="self-start mb-2 text-sm text-gray-600">Select ATS Type</label>
//             <Dropdown
//               menu={{ items: atsOptions, onClick: ({ key }) => setSelectedATS(key) }}
//               trigger={['click']}
//             >
//               <div className="w-full mb-6 px-4 py-3 border border-gray-300 rounded-full text-sm text-gray-700 flex justify-between items-center cursor-pointer bg-white shadow-sm hover:shadow-md transition-all duration-150">
//                 <span>{selectedATS || 'Select'}</span>
//                 <DownOutlined className="text-gray-500" />
//               </div>
//             </Dropdown>

//             <button
//               className="bg-button text-white px-6 py-3 rounded-full flex items-center justify-center w-full mb-4 pointer"
//               onClick={() => navigate(`/ats-job-id`, { state: { providerName: selectedATS } })}
//               disabled={!selectedATS}
//             >
//               SAVE & NEXT
//             </button>
//           </div>
//         </div>
//       </div>
//     </MainLayout>
//   )
// }

// export default AtsJobDetails

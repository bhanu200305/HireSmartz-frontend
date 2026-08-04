// import { useEffect, useState } from 'react'
// import { MoreOutlined, PlusOutlined } from '@ant-design/icons'
// import { useLocation, useNavigate } from 'react-router-dom'
// import { FaUsers } from 'react-icons/fa'
// import { MdOutlineFilterAlt } from 'react-icons/md'
// import { useDispatch, useSelector } from 'react-redux'
// import { RootState } from '../../../redux/provider/store'
// import { useArchiveOrgUserMutation } from '../../../api/tenant-service/Organisation/AddOrganisationUser'
// import { DateTimePayload, OrgUser, SortDirection } from '../../../types'
// import { handleArchive } from '../../../shared/utils/business-logic'
// import MainLayout from '../../../MainLayout'
// import { Loader } from '../../shared/ui/loader'
// import DateTimeRangePicker from '../../shared/ui/datePicker'
// import { formatPhoneNumber, handleDateValue } from '../../../shared/utils/methods'
// import { Button, Search, CommonCard, showToast } from '../../index'
// import { Col, Dropdown, Row, Select } from 'antd'
// import Pagination from '../../MasterPagination'
// import { COL } from '../../shared/ui/Columns'
// import { useOwnerDashboardMutation } from '../../../api/analytics-service/Dashboard/OwnerDashboard'
// import {
//   resetownerDashboardFilters,
//   setownerDashboardFilters
// } from '../../../redux/slices/OnwerDashboardFilterSlice'
// import useFetchRoles from '../../../hooks/useRoles'

// const { Option } = Select

// const RecruiterUserTable = () => {
//   const navigate = useNavigate()
//   const dispatch = useDispatch()
//   const location = useLocation()
//   const recruiterData = location.state?.data || []
//   const role = location.state?.role || ''
//   const [userList, setUserList] = useState<OrgUser[]>([])
//   const [totalItems, setTotalItems] = useState<number>(0)
//   const [isLoading, setIsLoading] = useState<boolean>(false)

//   const filters = useSelector((state: RootState) => state.ownerDashboardFiltersSlice)
//   const [fetchUsers, { data, error }] = useOwnerDashboardMutation()

//   const { roles } = useFetchRoles()

//   //   const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({
//   //     key: '',
//   //     direction: null
//   //   })

//   //   const handleSort = (key: string, direction: SortDirection) => {
//   //     setSortConfig({ key, direction })
//   //     dispatch(
//   //       setownerDashboardFilters({
//   //         sortBy: direction ? key : undefined,
//   //         sortDir: direction || undefined,
//   //         page: 0
//   //       })
//   //     )
//   //   }

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!roles?.data) return

//       const matchedRole = (roles as any).data.find(
//         (r: any) => r.roleName.toLowerCase() === role.toLowerCase()
//       )
//       const matchedRoleId = matchedRole?.id
//       if (!matchedRoleId) return

//       setIsLoading(true)
//       try {
//         const response = await fetchUsers({
//           page: filters.page,
//           pageSize: filters.size,
//           value: {
//             firstName: filters.searchQuery,
//             lastName: filters.searchQuery,
//             emailId: filters.searchQuery,
//             phoneNumber: filters.searchQuery,
//             status: filters.status,
//             isArchived: filters.isArchived,
//             startDateTime: filters.startDateTime,
//             endDateTime: filters.endDateTime,
//             roleTypeMappingId: matchedRoleId
//           }
//         })

//         if ('data' in response) {
//           ; (response as any)?.data.data
//             ? setUserList((response as any)?.data.data)
//             : setUserList(recruiterData?.data)
//             ; (response as any).data.totalElements
//               ? setTotalItems((response as any).data.totalElements)
//               : setTotalItems(recruiterData?.totalElements)
//           setIsLoading(false)
//         }
//       } catch (err) {
//         showToast({
//           message: 'Failed to fetch users',
//           type: 'error'
//         })
//       }
//     }

//     fetchData()
//   }, [filters, fetchUsers, role, roles])

//   const handlePageChange = (page: number) => {
//     dispatch(setownerDashboardFilters({ page }))
//   }

//   const handleSearch = (query: string) => {
//     dispatch(setownerDashboardFilters({ searchQuery: query, page: 0 }))
//   }

//   const handleDateTimeChange = (range: DateTimePayload) => {
//     dispatch(setownerDashboardFilters(range))
//   }

//   const handleReset = () => {
//     dispatch(
//       setownerDashboardFilters({
//         startDateTime: '',
//         endDateTime: ''
//       })
//     )
//   }

//   const handleStatusChange = (value: string) => {
//     if (value === 'ACTIVE') {
//       dispatch(
//         setownerDashboardFilters({
//           status: true,
//           isArchived: undefined,
//           page: 0
//         })
//       )
//     } else if (value === 'INACTIVE') {
//       dispatch(
//         setownerDashboardFilters({
//           status: false,
//           isArchived: undefined,
//           page: 0
//         })
//       )
//     } else if (value === 'ARCHIVED') {
//       dispatch(
//         setownerDashboardFilters({
//           status: undefined,
//           isArchived: true,
//           page: 0
//         })
//       )
//     } else {
//       dispatch(
//         setownerDashboardFilters({
//           status: undefined,
//           isArchived: undefined,
//           page: 0
//         })
//       )
//     }
//   }

//   const handleCopy = (text: string) => {
//     navigator.clipboard.writeText(text)
//     showToast({
//       message: 'Copied to clipboard',
//       type: 'success'
//     })
//   }

//   const renderActions = (record: OrgUser) => {
//     return (
//       <Dropdown
//         menu={{
//           items: [
//             {
//               key: 'view',
//               label: 'View',
//               onClick: () => navigate(`/view-organisation-user?orgUserId=${record.id}`)
//             },
//             {
//               key: 'edit',
//               label: 'Edit',
//               onClick: () => navigate(`/edit-organisation-user?orgUserId=${record.id}`)
//             }
//           ]
//         }}
//         trigger={['click']}
//       >
//         <MoreOutlined
//           style={{ cursor: 'pointer', fontSize: '20px' }}
//           onClick={(e) => e.stopPropagation()}
//         />
//       </Dropdown>
//     )
//   }

//   return (
//     <div>
//       <MainLayout>
//         <div className="w-full p-8 justify-start pt-16">
//           {isLoading && <Loader />}
//           <div className="flex space-x-4 justify-between p-2">
//             <div className="flex items-center space-x-2">
//               <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
//                 <FaUsers size={18} />
//               </span>
//               <h2 className="text-xl font-semibold">{role ? role : 'Users'}</h2>
//             </div>
//             <div className="flex space-x-4 ">
//               <Search
//                 appname="User"
//                 placeholder="Search user..."
//                 onSearch={handleSearch}
//                 allowClear
//                 value={filters.searchQuery}
//               />
//               <DateTimeRangePicker
//                 value={handleDateValue(filters)}
//                 onApply={handleDateTimeChange}
//                 onReset={handleReset}
//               />
//               <div className="border border-[var(--border)] p-1 rounded-3xl w-40 flex items-center ">
//                 <MdOutlineFilterAlt className={`ml-3 text-lg`} />
//                 <Select
//                   placeholder="Status"
//                   onChange={handleStatusChange}
//                   allowClear
//                   className="w-full custom-select"
//                   popupClassName="rounded-3xl"
//                   value={
//                     filters.isArchived
//                       ? 'ARCHIVED'
//                       : filters.status === true
//                         ? 'ACTIVE'
//                         : filters.status === false
//                           ? 'INACTIVE'
//                           : undefined
//                   }
//                 >
//                   <Option value="ACTIVE">Active</Option>
//                   <Option value="INACTIVE">Inactive</Option>
//                   <Option value="ARCHIVED">Archived</Option>
//                 </Select>
//               </div>
//               <Button
//                 appname="add user"
//                 className="w-100% text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2"
//                 onClick={() => navigate('/add-organisation-users')}
//               >
//                 <PlusOutlined className="text-lg" /> <span>ADD USER</span>
//               </Button>
//             </div>
//           </div>
//           <div className="w-full p-2 justify-start">
//             <Row
//               gutter={[16, 16]}
//               className="font-bold  py-2 px-2 bg-[#FAFAFA] border border-[var(--border)]"
//             >
//               <Col span={3} className="px-4 py-2  border-[var(--border)]">
//                 ACTIONS
//               </Col>
//               <Col span={3} className="px-4 py-2  border-[var(--border)]">
//                 EMPLOYEE CODE
//               </Col>
//               <COL
//                 // sortable
//                 // sortKey="firstName"
//                 // currentSortKey={currentSortKey}
//                 // onSort={handleSort}
//                 span={3}
//                 className="px-4 py-2 border-[var(--border)]"
//               >
//                 FIRST NAME
//               </COL>
//               <COL
//                 // sortable
//                 // sortKey="lastName"
//                 // currentSortKey={currentSortKey}
//                 // onSort={handleSort}
//                 span={3}
//                 className="px-4 py-2"
//               >
//                 LAST NAME
//               </COL>
//               <Col span={4} className="px-4 py-2">
//                 EMAIL
//               </Col>
//               <Col span={4} className="px-4 py-2">
//                 PHONE NUMBER
//               </Col>
//               <Col span={4} className="px-4 py-2">
//                 ROLE
//               </Col>
//             </Row>
//           </div>
//           <div className="w-full">
//             {userList.map((orgUser: any) => (
//               <div key={orgUser.id} className="mb-4 mt-2">
//                 <CommonCard>
//                   <Row gutter={[16, 16]} align="middle">
//                     <Col span={3} className="flex items-center justify-center">
//                       {renderActions(orgUser)}
//                     </Col>
//                     <Col span={3}>
//                       <p>{orgUser.employeeId}</p>
//                     </Col>
//                     <Col span={3}>
//                       <p>{orgUser.firstName}</p>
//                     </Col>
//                     <Col span={3}>
//                       <p>{orgUser.lastName}</p>
//                     </Col>
//                     <Col span={4}>
//                       <p>{orgUser.emailId}</p>
//                     </Col>
//                     <Col span={4}>
//                       <p>{`${orgUser.countryCode}-${formatPhoneNumber(orgUser.phoneNumber)}`}</p>
//                     </Col>
//                     <Col span={4}>
//                       <p>{orgUser.role}</p>
//                     </Col>
//                   </Row>
//                 </CommonCard>
//               </div>
//             ))}
//           </div>
//           <Pagination
//             currentPage={filters.page + 1}
//             totalPages={Math.ceil((totalItems || 10) / (filters.size || 10))}
//             totalItems={totalItems}
//             entityLabel="users"
//             onPageChange={(page) => handlePageChange(page - 1)}
//           />
//         </div>
//       </MainLayout>
//     </div>
//   )
// }

// export default RecruiterUserTable

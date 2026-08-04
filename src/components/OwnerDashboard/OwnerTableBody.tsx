import { useNavigate } from 'react-router-dom';

type OwnerTableBodyProps = {
  data?: any;
  title?: string;
};
const OwnerTableBody: React.FC<OwnerTableBodyProps> = ({ data, title }) => {
  const navigate = useNavigate();
  return (
    <>
      {(title === 'Recruiters' || title === 'Hiring Managers') && (
        <tbody>
          {data?.map((customer: any, index: number) => (
            <tr key={customer?.id + '_' + index}>
              <td
                className="py-2 px-1 hover:text-primary cursor-pointer"
                onClick={() => navigate(`/view-organisation-user?orgUserId=${customer.id}`)}
              >
                <p className="text-primary underline">{customer?.employeeId} </p>
              </td>
              <td className="py-2 px-1">{customer?.firstName + ' ' + customer?.lastName}</td>
              <td className="py-2 px-1">{customer?.emailId}</td>
            </tr>
          ))}
        </tbody>
      )}
      {title === 'Job Openings' && (
        <tbody>
          {data?.map((customer: any, index: number) => (
            <tr key={customer?.id + index}>
              <td
                className="py-2 px-1 hover:text-primary cursor-pointer"
                onClick={() =>
                  navigate(`/jobs/view/${customer.jobOpeningId}/candidates?page=1&size=10`, {
                    state: { fromDashboard: true },
                  })
                }
              >
                <p className="text-primary underline">{customer?.jobTitleName}</p>
              </td>
              <td
                className="py-2 px-1 hover:text-primary cursor-pointer"
                onClick={() =>
                  navigate(`/jobs/view/${customer.jobOpeningId}/candidates`, {
                    state: { fromDashboard: true },
                  })
                }
              >
                <p className="text-primary underline">{customer?.candidateCount}</p>
              </td>
              <td className="py-2 px-1">{customer?.openings}</td>
              <td className="py-2 px-1">{customer?.interviewedCandidateCount}</td>
            </tr>
          ))}
        </tbody>
      )}
    </>
  );
};

export default OwnerTableBody;

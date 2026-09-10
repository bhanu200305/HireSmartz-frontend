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
          {data?.length ? (
            data.map((row: any, index: number) => (
              <tr key={`${row?.id ?? 'user'}_${index}`}>
                <td
                  className="py-2 px-1 hover:text-primary cursor-pointer"
                  onClick={() => navigate(`/view-organisation-user?orgUserId=${row.id}`)}
                >
                  <p className="text-primary underline">{row?.fullName}</p>
                </td>
                <td className="py-2 px-1">{row?.email}</td>
                <td className="py-2 px-1">{row?.roleLabel}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="py-6 text-center text-sm text-neutral-400">
                No {title?.toLowerCase()} yet.
              </td>
            </tr>
          )}
        </tbody>
      )}
      {title === 'Job Openings' && (
        <tbody>
          {data?.map((customer: any, index: number) => (
            // Job-opening rows carry `jobOpeningId`, not `id` — `customer?.id
            // + index` was `undefined + n` => `NaN` for every row (duplicate
            // keys). Use the real id, string-joined so a missing one can't
            // collapse to NaN again.
            <tr key={`${customer?.jobOpeningId ?? 'job'}_${index}`}>
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

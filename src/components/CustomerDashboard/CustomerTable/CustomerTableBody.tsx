import Badge from '../Badge';

const TableBody = ({ users }: { users: any[] }) => {
  return (
    <tbody>
      {users.map((user, index) => (
        <tr key={index}>
          <td className="p-2">{user.employeeCode}</td>
          <td className="p-2">{user.firstName}</td>
          <td className="p-2">{user.lastName}</td>
          <td className="p-2">{user.email}</td>
          <td className="p-2">{user.phone}</td>
          <td className="p-2">{user.role}</td>
          <td className="p-2">
            <Badge status={user.status} />
          </td>
        </tr>
      ))}
    </tbody>
  );
};

export default TableBody;

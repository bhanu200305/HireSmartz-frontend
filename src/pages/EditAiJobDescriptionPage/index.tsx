import { Outlet } from 'react-router-dom';
import { EditAiJobDescription } from '../../components';

const EditAiJobDescriptionPage = () => {
  return (
    <>
      <EditAiJobDescription />
      <Outlet />
    </>
  );
};

export default EditAiJobDescriptionPage;

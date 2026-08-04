import { ReactNode } from 'react';
import { MdOutlineArrowBack } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

interface AddUserLayoutProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  button?: ReactNode;
  companyName?: string;
}

const AddUserLayout = ({
  children,
  companyName,
  title = '',
  subtitle = 'Please enter the following details',
  button,
}: AddUserLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-16">
      {/* Back Button */}
      <div className="mb-4 self-start px-4 absolute">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back</span>
        </button>
      </div>

      <div className="bg-[#FAFAFA] p-6 md:p-10 rounded-2xl shadow-lg w-full max-w-md">
        <p className="text-xl text-center font-semibold text-black mb-2">{companyName}</p>
        <div className="text-center mb-4">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-gray-600">{subtitle}</p>
        </div>

        {children}

        {button && <div className="mt-4">{button}</div>}
      </div>
    </div>
  );
};

export default AddUserLayout;

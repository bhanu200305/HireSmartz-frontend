// import { Link } from 'react-router-dom'
import MainLayout from '../../layouts/MainLayout';

const NotFoundPage = () => {
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
        <p className="text-lg text-gray-600 mb-6">
          Sorry, the page you are looking for does not exist.
        </p>
      </div>
    </MainLayout>
  );
};

export default NotFoundPage;

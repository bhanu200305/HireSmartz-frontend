import { Form } from 'antd';
import { Button, Input, showToast } from '../..';
import { useNavigate } from 'react-router-dom';
import { BsCalendar4Event } from 'react-icons/bs';
import MainLayout from '../../../layouts/MainLayout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addCustomerSchema } from '../AddCustomer/addCustomerSchema';
import { useAddCompanyMutation } from '../../../api/tenant-service/Company/addCompany';
import { get } from 'lodash-es';
import { Loader } from '../../shared/ui/loader';

const AddNewPackage = () => {
  const navigate = useNavigate();
  const [, { isLoading }] = useAddCompanyMutation();

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: {
      companyName: '',
      websiteLink: '',
      firstNamePrimary: '',
      lastNamePrimary: '',
      firstNameSecondary: '',
      lastNameSecondary: '',
      addressLine1: '',
      addressLine2: '',
    },
    mode: 'onChange',
  });

  const handleAddPackage = async () => {
    // const payload = {
    //   packageName: data.companyName,
    //   atsPlatformAccess: data.websiteLink,
    //   aiCvScreening: data.firstNamePrimary,
    //   aiInterviewAnalysis: data.lastNamePrimary,
    //   jobPostLimit: data.firstNameSecondary,
    //   jdGenerator: data.lastNameSecondary,
    //   cloudStorage: data.addressLine1,
    //   whiteLabelling: data.addressLine2,
    // };

    try {
      //   const res = await addPackage(payload).unwrap();
      //   showToast({
      //     message: get(res, 'message', 'Package added successfully'),
      //     type: 'success',
      //   });
      navigate(-1);
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Failed to add package'),
        type: 'error',
      });
    }
  };

  return (
    <div>
      <MainLayout>
        <div className="flex flex-col items-center bg-white px-6 mt-6 pt-16 pb-10">
          {isLoading && <Loader />}
          <div className="w-full justify-start mb-6">
            <div className="flex items-center space-x-2">
              <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
                <BsCalendar4Event size={18} />
              </span>
              <h2 className="text-xl font-semibold">Add New Package</h2>
            </div>
          </div>

          <div className="bg-[#FAFAFA] p-8 rounded-2xl shadow-lg w-full max-w-2xl">
            <h2 className="text-center text-2xl font-semibold mb-2">Add New Package</h2>
            <p className="text-center text-gray-500 mb-6">Please enter the following details</p>

            <Form layout="vertical">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Form.Item label="Voice Agent Usage: Calling Minutes">
                  <Input
                    {...register('companyName')}
                    placeholder="No. of minutes"
                    className="bg-white w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                  />
                  {/* <p className="text-red-500 text-sm">{errors.companyName?.message}</p> */}
                </Form.Item>

                <Form.Item label="ATS Platforms Access">
                  <Input
                    {...register('websiteLink')}
                    placeholder="ATS Platforms Access"
                    className="bg-white w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                  />
                  {/* <p className="text-red-500 text-sm">{errors.websiteLink?.message}</p> */}
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Form.Item label="AI-Based CV Screening and Scoring Enabled">
                  <Input
                    {...register('firstNamePrimary')}
                    placeholder="Enabled / Disabled"
                    className="bg-white w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                  />
                  {/* <p className="text-red-500 text-sm">{errors.firstNamePrimary?.message}</p> */}
                </Form.Item>

                <Form.Item label="AI-Based Interview Analysis Enabled">
                  <Input
                    {...register('lastNamePrimary')}
                    placeholder="Enabled / Disabled"
                    className="bg-white w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                  />
                  {/* <p className="text-red-500 text-sm">{errors.lastNamePrimary?.message}</p> */}
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Form.Item label="Number of Job Postings">
                  <Input
                    {...register('firstNameSecondary')}
                    placeholder="e.g., 10, 50, Unlimited"
                    className="bg-white w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                  />
                  {/* <p className="text-red-500 text-sm">{errors.firstNameSecondary?.message}</p> */}
                </Form.Item>

                <Form.Item label="AI-Driven JD Creation Enabled">
                  <Input
                    {...register('lastNameSecondary')}
                    placeholder="Enabled / Disabled"
                    className="bg-white w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                  />
                  {/* <p className="text-red-500 text-sm">{errors.lastNameSecondary?.message}</p> */}
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Form.Item label="Cloud Access and Storage Limit">
                  <Input
                    {...register('addressLine1')}
                    placeholder="Select as per subscription tiers"
                    className="bg-white w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                  />
                  {/* <p className="text-red-500 text-sm">{errors.addressLine1?.message}</p> */}
                </Form.Item>

                <Form.Item label="White Labeling">
                  <Input
                    {...register('addressLine2')}
                    placeholder="Select platform customization"
                    className="bg-white w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                  />
                  {/* <p className="text-red-500 text-sm">{errors.addressLine2?.message}</p> */}
                </Form.Item>
              </div>

              <Form.Item className="mt-6">
                <Button
                  appname="add-package"
                  className="w-full text-white bg-[var(--color-primary)] rounded-3xl py-3"
                  onClick={handleSubmit(handleAddPackage)}
                >
                  SUBMIT
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </MainLayout>
    </div>
  );
};

export default AddNewPackage;

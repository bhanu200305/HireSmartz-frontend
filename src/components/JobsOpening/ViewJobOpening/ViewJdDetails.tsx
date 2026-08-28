import { useParams } from 'react-router-dom';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import ReactMarkdown from 'react-markdown';
import { Loader } from '../../shared/ui/loader';
import { makeFirstLetterUpperCase } from '../../../shared/utils/methods';
import { formatAiJobDescription } from '../../../shared/utils/business-logic';
import { asJobId } from '../../../api/job-service/jobId';

const ViewJdDetails = () => {
  const { id } = useParams();
  const jobId = asJobId(id);
  const { data: jobData, isLoading } = useGetJobOpeningByIdQuery(
    { jobOpeningId: jobId },
    { skip: !jobId }
  );
  const formatMarkdownHeadings = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') {
      const parts = children.split(':');
      if (parts.length > 1) {
        return (
          <>
            {parts[0]}: <p className="font-normal">{parts.slice(1).join(':')}</p>
          </>
        );
      } else {
        return <>{parts[0]}:</>;
      }
    }
    return children as string;
  };
  return (
    <>
      {isLoading && <Loader />}
      <div className="w-full">
        <span className="mt-4 mb-4 self-start px-6 py-4">
          <h1>AI based job description</h1>
        </span>
        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-lg ">
          <div className="prose max-w-none prose-p:my-2 prose-li:my-1 prose-h2:mt-4 prose-h2:mb-2">
            <ReactMarkdown
              components={{
                h1: ({ node: _node, ...props }) => (
                  <h1
                    className="text-2xl flex gap-2 items-center font-bold capitalize mb-3"
                    {...props}
                  >
                    {formatMarkdownHeadings(props.children)}
                  </h1>
                ),
                h2: ({ node: _node, ...props }) => (
                  <h3
                    className="text-xl font-semibold flex gap-2 items-center capitalize py-2"
                    {...props}
                  >
                    {formatMarkdownHeadings(props.children)}
                  </h3>
                ),
                h3: ({ node: _node, ...props }) => (
                  <h3
                    className="text-lg font-semibold flex gap-2 items-center capitalize py-2"
                    {...props}
                  >
                    {formatMarkdownHeadings(props.children)}
                  </h3>
                ),
                li: ({ node: _node, ...props }) => (
                  <li className="list-disc ml-8">{props.children}</li>
                ),
                p: ({ node: _node, ...props }) => {
                  const children = props.children;
                  const isString = typeof children === 'string';
                  return (
                    <p className="my-2">
                      {isString ? makeFirstLetterUpperCase(children) : children}
                    </p>
                  );
                },
              }}
            >
              {formatAiJobDescription(
                jobData?.data.aiJobDescription?.jobDescription || 'No Description Available'
              )}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewJdDetails;

import { Form, Select } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { MdClose } from 'react-icons/md';
import { Button } from '../../shared';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';

type QuestionCategoryOption = {
  id: string | number;
  name: string;
};

type QuestionFormModalProps = {
  open: boolean;
  title: string;
  questionText: string;
  submitLabel: string;
  isSubmitting: boolean;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  disableSubmit?: boolean;
  placeholder?: string;
  maxLength?: number;
  showCount?: boolean;
  roundName?: string;
  categoryId?: string | number;
  isCategoryLoading?: boolean;
  categoryOptions?: QuestionCategoryOption[];
  onCategoryChange?: (value: string | number) => void;
};

const QuestionFormModal = ({
  open,
  title,
  questionText,
  submitLabel,
  isSubmitting,
  onQuestionChange,
  onSubmit,
  onClose,
  disableSubmit = false,
  placeholder = 'Type question here...',
  maxLength = 1000,
  showCount = false,
  roundName,
  categoryId,
  isCategoryLoading = false,
  categoryOptions = [],
  onCategoryChange,
}: QuestionFormModalProps) => {
  const showCategoryField = Boolean(onCategoryChange);

  return (
    <AntdCommonModal open={open} onClose={onClose} modalProps={{ width: 500, closable: false }}>
      <div className="bg-[#FAFAFA] p-6 rounded-lg relative">
        <button
          className="absolute top-4 right-4 text-primary cursor-pointer"
          onClick={() => {
            if (!isSubmitting) {
              onClose();
            }
          }}
        >
          <MdClose size={20} />
        </button>

        <h2 className="text-lg font-semibold text-center mb-6">{title}</h2>
        <Form layout="vertical" onFinish={onSubmit}>
          {roundName && (
            <Form.Item
              label={
                <span>
                  Round <span className="required-asterisk">*</span>
                </span>
              }
            >
              <div className="w-full p-2 mt-1 bg-white border rounded-3xl border-[var(--border)] text-gray-600">
                {roundName}
              </div>
            </Form.Item>
          )}

          {showCategoryField && (
            <Form.Item
              label={
                <span>
                  Category <span className="required-asterisk">*</span>
                </span>
              }
            >
              <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                <Select
                  value={categoryId}
                  onChange={onCategoryChange}
                  className="w-full custom-select placeholder-style"
                  placeholder="Select Question Category"
                  popupClassName="rounded-3xl"
                  loading={isCategoryLoading}
                >
                  {categoryOptions.length > 0 ? (
                    categoryOptions.map((option) => (
                      <Select.Option key={option.id} value={option.id}>
                        {option.name}
                      </Select.Option>
                    ))
                  ) : (
                    <Select.Option value="No Categories" disabled>
                      No Categories Found
                    </Select.Option>
                  )}
                </Select>
              </div>
            </Form.Item>
          )}

          <Form.Item
            label={
              <span>
                Question <span className="required-asterisk">*</span>
              </span>
            }
          >
            <TextArea
              value={questionText}
              onChange={(event) => onQuestionChange(event.target.value)}
              placeholder={placeholder}
              rows={4}
              maxLength={maxLength}
              showCount={showCount}
              className="w-full p-2 mt-1 bg-white border rounded-lg border-[var(--border)]"
            />
          </Form.Item>

          <Button
            className={`${
              isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary cursor-pointer'
            } text-white py-2 w-full rounded-3xl transition`}
            htmlType="submit"
            disabled={isSubmitting || disableSubmit}
          >
            <span className="roboto-font">{submitLabel}</span>
          </Button>
        </Form>
      </div>
    </AntdCommonModal>
  );
};

export default QuestionFormModal;

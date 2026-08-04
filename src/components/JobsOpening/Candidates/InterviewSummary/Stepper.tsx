import React from 'react';

type StepperProps = {
  steps: number;
  currentStep: number;
};

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex justify-center items-center">
      {Array.from({ length: steps }).map((_, index) => {
        const step = index + 1;
        const isActive = step === currentStep;

        return (
          <React.Fragment key={step}>
            <div
              className={`w-12 h-12 flex items-center justify-center rounded-full border 
                ${isActive ? 'bg-blue-600 text-white font-bold' : 'border-gray-300 text-gray-600 font-bold'}
              `}
            >
              {step}
            </div>
            {step < steps && <div className="border-t border-dashed border-gray-300 w-15" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;

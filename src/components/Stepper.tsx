import React from 'react';

interface Step {
    id: number;
    title: string;
    description?: string;
}

interface StepperProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (stepId: number) => void;
    allowClickNavigation?: boolean;
}

/**
 * Componente Stepper reutilizável para indicar progresso em fluxos multi-etapas
 */
const Stepper: React.FC<StepperProps> = ({
    steps,
    currentStep,
    onStepClick,
    allowClickNavigation = false
}) => {
    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep;
                    const isClickable = allowClickNavigation && (isCompleted || step.id === currentStep);

                    return (
                        <React.Fragment key={step.id}>
                            {/* Step Circle + Label */}
                            <div
                                className={`flex flex-col items-center ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={() => isClickable && onStepClick?.(step.id)}
                            >
                                <div
                                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                    transition-all duration-300 border-2
                    ${isCompleted
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : isActive
                                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                                                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                                        }
                  `}
                                >
                                    {isCompleted ? (
                                        <span className="material-symbols-outlined text-lg">check</span>
                                    ) : (
                                        step.id
                                    )}
                                </div>
                                <div className="mt-2 text-center">
                                    <p className={`text-sm font-medium transition-colors ${isActive
                                            ? 'text-primary'
                                            : isCompleted
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {step.title}
                                    </p>
                                    {step.description && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">
                                            {step.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 mx-2 sm:mx-4 h-0.5 rounded-full bg-gray-200 dark:bg-gray-700 relative">
                                    <div
                                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500 w-full' : 'bg-gray-200 dark:bg-gray-700 w-0'
                                            }`}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default Stepper;

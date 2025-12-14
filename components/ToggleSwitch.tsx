import React from 'react';

const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}> = ({ enabled, onChange, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={`${enabled ? 'bg-blue-600' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
    >
        <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);

export default ToggleSwitch;

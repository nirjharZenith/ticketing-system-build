import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, id, className = '', ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="form-group">
        {label && <label htmlFor={inputId}>{label}</label>}
        <input ref={ref} id={inputId} className={`form-input ${className}`.trim()} {...props} />
        {hint && <p className="form-hint">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

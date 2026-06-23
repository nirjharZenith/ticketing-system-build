import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

const Select: React.FC<SelectProps> = ({ label, id, options, className = '', ...props }) => {
  const selectId = id || props.name;

  return (
    <div className="form-group">
      {label && <label htmlFor={selectId}>{label}</label>}
      <select id={selectId} className={`form-select ${className}`.trim()} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;

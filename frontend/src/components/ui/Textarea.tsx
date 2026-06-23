import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, className = '', ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="form-group">
        {label && <label htmlFor={textareaId}>{label}</label>}
        <textarea ref={ref} id={textareaId} className={`form-textarea ${className}`.trim()} {...props} />
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;

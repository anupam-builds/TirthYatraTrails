import React from 'react';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
  name?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
  labelClassName?: string;
}

export interface FormSelectOption {
  value: string | number;
  label: string;
}

export interface FormSelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id?: string;
  name?: string;
  options?: FormSelectOption[];
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  children?: React.ReactNode;
}

export interface FormTextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  id?: string;
  name?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
  labelClassName?: string;
}

/**
 * FormField component:
 * Guarantees id={id || name} and name={name || id} are explicitly bound directly
 * to native <input>, and that associated <label htmlFor={controlId}> strictly matches.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  name,
  value,
  onChange,
  className = '',
  wrapperClassName = '',
  labelClassName = '',
  error,
  helperText,
  ...rest
}) => {
  const controlId = id || name;
  const controlName = name || id;

  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={controlId}
          className={`text-xs font-medium text-slate-300 ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <input
        id={controlId}
        name={controlName}
        value={value}
        onChange={onChange}
        className={`bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
          error ? 'border-red-500 focus:ring-red-500' : ''
        } ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
      {!error && helperText && <span className="text-xs text-slate-400 mt-0.5">{helperText}</span>}
    </div>
  );
};

/**
 * FormSelectField component:
 * Guarantees id={id || name} and name={name || id} are explicitly bound directly
 * to native <select>, with associated <label htmlFor={controlId}>.
 */
export const FormSelectField: React.FC<FormSelectFieldProps> = ({
  label,
  id,
  name,
  value,
  onChange,
  options,
  children,
  className = '',
  wrapperClassName = '',
  labelClassName = '',
  error,
  helperText,
  ...rest
}) => {
  const controlId = id || name;
  const controlName = name || id;

  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={controlId}
          className={`text-xs font-medium text-slate-300 ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <select
        id={controlId}
        name={controlName}
        value={value}
        onChange={onChange}
        className={`bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
          error ? 'border-red-500 focus:ring-red-500' : ''
        } ${className}`}
        {...rest}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
      {!error && helperText && <span className="text-xs text-slate-400 mt-0.5">{helperText}</span>}
    </div>
  );
};

/**
 * FormTextareaField component:
 * Guarantees id={id || name} and name={name || id} are explicitly bound directly
 * to native <textarea>, with associated <label htmlFor={controlId}>.
 */
export const FormTextareaField: React.FC<FormTextareaFieldProps> = ({
  label,
  id,
  name,
  value,
  onChange,
  className = '',
  wrapperClassName = '',
  labelClassName = '',
  error,
  helperText,
  ...rest
}) => {
  const controlId = id || name;
  const controlName = name || id;

  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={controlId}
          className={`text-xs font-medium text-slate-300 ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <textarea
        id={controlId}
        name={controlName}
        value={value}
        onChange={onChange}
        className={`bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
          error ? 'border-red-500 focus:ring-red-500' : ''
        } ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
      {!error && helperText && <span className="text-xs text-slate-400 mt-0.5">{helperText}</span>}
    </div>
  );
};

export default FormField;

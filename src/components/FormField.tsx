import React from 'react';

/**
 * Generates a clean fallback attribute if neither id nor name is specified.
 */
function useFallbackFieldIds(id?: string, name?: string, prefix: string = 'field') {
  const generatedId = React.useId();
  const cleanId = generatedId.replace(/:/g, '');
  const resolvedId = id || name || `${prefix}-${cleanId}`;
  const resolvedName = name || id || resolvedId;
  return { resolvedId, resolvedName };
}

/**
 * BaseInput primitive:
 * Guarantees native id and name presence on the <input> element.
 */
export const BaseInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ id, name, ...props }, ref) => {
    const { resolvedId, resolvedName } = useFallbackFieldIds(id, name, 'input');
    return <input ref={ref} id={resolvedId} name={resolvedName} {...props} />;
  }
);
BaseInput.displayName = 'BaseInput';

/**
 * BaseSelect primitive:
 * Guarantees native id and name presence on the <select> element.
 */
export const BaseSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ id, name, children, ...props }, ref) => {
    const { resolvedId, resolvedName } = useFallbackFieldIds(id, name, 'select');
    return (
      <select ref={ref} id={resolvedId} name={resolvedName} {...props}>
        {children}
      </select>
    );
  }
);
BaseSelect.displayName = 'BaseSelect';

/**
 * BaseTextarea primitive:
 * Guarantees native id and name presence on the <textarea> element.
 */
export const BaseTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ id, name, ...props }, ref) => {
    const { resolvedId, resolvedName } = useFallbackFieldIds(id, name, 'textarea');
    return <textarea ref={ref} id={resolvedId} name={resolvedName} {...props} />;
  }
);
BaseTextarea.displayName = 'BaseTextarea';

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
 * Guarantees id and name are explicitly bound directly
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
  const { resolvedId: controlId, resolvedName: controlName } = useFallbackFieldIds(id, name, 'input');

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
 * Guarantees id and name are explicitly bound directly
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
  const { resolvedId: controlId, resolvedName: controlName } = useFallbackFieldIds(id, name, 'select');

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
 * Guarantees id and name are explicitly bound directly
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
  const { resolvedId: controlId, resolvedName: controlName } = useFallbackFieldIds(id, name, 'textarea');

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

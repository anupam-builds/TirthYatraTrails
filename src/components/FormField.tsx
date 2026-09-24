import React from 'react';

/**
 * Generates a clean, unique fallback attribute if neither id nor name is specified.
 */
function useFallbackFieldIds(id?: string, name?: string, prefix: string = 'field') {
  const generatedId = React.useId();
  const cleanId = generatedId.replace(/:/g, '');
  const resolvedId = id || name || `${prefix}-${cleanId}`;
  const resolvedName = name || id || resolvedId;
  return { resolvedId, resolvedName };
}

/**
 * Infers an appropriate autocomplete attribute if not explicitly specified.
 */
function inferAutoComplete(type?: string, name?: string, id?: string, currentAuto?: string): string | undefined {
  if (currentAuto !== undefined) return currentAuto;
  const n = (name || id || '').toLowerCase();
  const t = (type || '').toLowerCase();

  if (t === 'password') {
    if (n.includes('new') || n.includes('confirm') || n.includes('create')) return 'new-password';
    return 'current-password';
  }
  if (t === 'email' || n.includes('email')) return 'email';
  if (t === 'tel' || n.includes('phone') || n.includes('mobile') || n.includes('whatsapp')) return 'tel';
  if (n.includes('name') && !n.includes('hotel') && !n.includes('city') && !n.includes('room') && !n.includes('file')) {
    return 'name';
  }
  if (t === 'search' || n.includes('search') || n.includes('filter') || n.includes('query')) {
    return 'off';
  }
  return undefined;
}

/**
 * BaseInput primitive:
 * Guarantees native id, name, and accessibility attributes on the <input> element.
 */
export const BaseInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ id, name, type, autoComplete, 'aria-label': ariaLabel, placeholder, ...props }, ref) => {
    const { resolvedId, resolvedName } = useFallbackFieldIds(id, name, 'input');
    const computedAutoComplete = inferAutoComplete(type, resolvedName, resolvedId, autoComplete);
    const resolvedAriaLabel = ariaLabel || (placeholder && typeof placeholder === 'string' ? placeholder : resolvedName);

    return (
      <input
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        type={type}
        autoComplete={computedAutoComplete}
        aria-label={resolvedAriaLabel}
        placeholder={placeholder}
        {...props}
      />
    );
  }
);
BaseInput.displayName = 'BaseInput';

/**
 * BaseSelect primitive:
 * Guarantees native id, name, and accessibility attributes on the <select> element.
 */
export const BaseSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ id, name, children, 'aria-label': ariaLabel, ...props }, ref) => {
    const { resolvedId, resolvedName } = useFallbackFieldIds(id, name, 'select');
    const resolvedAriaLabel = ariaLabel || resolvedName;
    return (
      <select
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        aria-label={resolvedAriaLabel}
        {...props}
      >
        {children}
      </select>
    );
  }
);
BaseSelect.displayName = 'BaseSelect';

/**
 * BaseTextarea primitive:
 * Guarantees native id, name, and accessibility attributes on the <textarea> element.
 */
export const BaseTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ id, name, 'aria-label': ariaLabel, placeholder, ...props }, ref) => {
    const { resolvedId, resolvedName } = useFallbackFieldIds(id, name, 'textarea');
    const resolvedAriaLabel = ariaLabel || (placeholder && typeof placeholder === 'string' ? placeholder : resolvedName);
    return (
      <textarea
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        aria-label={resolvedAriaLabel}
        placeholder={placeholder}
        {...props}
      />
    );
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
 * Guarantees id, name, and autofill compliance directly
 * to native <input>, with associated <label htmlFor={controlId}>.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  name,
  type,
  autoComplete,
  value,
  onChange,
  className = '',
  wrapperClassName = '',
  labelClassName = '',
  error,
  helperText,
  placeholder,
  ...rest
}) => {
  const { resolvedId: controlId, resolvedName: controlName } = useFallbackFieldIds(id, name, 'input');
  const computedAutoComplete = inferAutoComplete(type, controlName, controlId, autoComplete);

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
        type={type}
        autoComplete={computedAutoComplete}
        aria-label={label || placeholder || controlName}
        placeholder={placeholder}
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
        aria-label={label || controlName}
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
  placeholder,
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
        aria-label={label || placeholder || controlName}
        placeholder={placeholder}
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

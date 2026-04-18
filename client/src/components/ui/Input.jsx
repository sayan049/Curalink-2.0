import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

const Input = forwardRef(
  (
    {
      className,
      label,
      error,
      icon: Icon,
      type = 'text',
      helperText,
      required = false,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              'w-full px-4 py-3 rounded-xl border-2 border-slate-200',
              'focus:border-primary-500 focus:ring-4 focus:ring-primary-100',
              'transition-all duration-200 outline-none',
              'bg-white disabled:opacity-50 disabled:cursor-not-allowed',
              'placeholder:text-slate-400',
              Icon && 'pl-12',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-100',
              className
            )}
            {...props}
          />
        </div>
        {helperText && !error && (
          <p className="mt-1 text-sm text-slate-500">{helperText}</p>
        )}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
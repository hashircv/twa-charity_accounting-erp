import { ChevronDown } from "lucide-react";
import type { ChangeEvent, FocusEvent, InputHTMLAttributes, Ref, SelectHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";

const fieldBase =
  "w-full rounded border border-slate-200 bg-white px-3 py-2 text-base outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:text-sm";

const selectBase =
  "flex h-11 w-full items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-left text-base outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:h-10 sm:text-sm";

const errorRing = "border-red-400 focus:border-red-500 focus:ring-red-500";

interface FieldWrapperProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

function FieldWrapper({ label, error, children, htmlFor }: FieldWrapperProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, id, ...props }: TextFieldProps) {
  return (
    <FieldWrapper label={label} error={error} htmlFor={id}>
      <input id={id} className={`${fieldBase} ${error ? errorRing : ""}`} {...props} />
    </FieldWrapper>
  );
}

interface NumberFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function NumberField({ label, error, id, ...props }: NumberFieldProps) {
  return (
    <FieldWrapper label={label} error={error} htmlFor={id}>
      <input id={id} type="number" className={`${fieldBase} ${error ? errorRing : ""}`} {...props} />
    </FieldWrapper>
  );
}

type SelectOption = { value: string; label: string };

function setRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

interface SelectControlProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
  searchable?: boolean;
}

export function SelectControl({
  error,
  id,
  options,
  placeholder,
  className = "",
  onChange,
  onBlur,
  ref,
  value,
  defaultValue,
  disabled,
  searchable = false,
  ...props
}: SelectControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedValue, setSelectedValue] = useState(String(value ?? defaultValue ?? ""));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const allOptions = placeholder ? [{ value: "", label: placeholder, disabled: true }, ...options] : options;
  const selectedLabel = allOptions.find((option) => option.value === selectedValue)?.label ?? placeholder ?? "Select";
  const filteredOptions =
    searchable && search.trim()
      ? allOptions.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()))
      : allOptions;

  useEffect(() => {
    const nextValue = value ?? selectRef.current?.value ?? defaultValue ?? "";
    setSelectedValue(String(nextValue));
  }, [defaultValue, options, value]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  const chooseValue = (nextValue: string) => {
    if (disabled) return;
    const select = selectRef.current;
    setSelectedValue(nextValue);
    setIsOpen(false);
    setSearch("");

    if (select) {
      select.value = nextValue;
      onChange?.({ target: select, currentTarget: select } as ChangeEvent<HTMLSelectElement>);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <select
        {...props}
        ref={(element) => {
          selectRef.current = element;
          if (element) setRef(ref, element);
        }}
        id={id ? `${id}-native` : undefined}
        className="sr-only"
        tabIndex={-1}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={(event) => {
          setSelectedValue(event.target.value);
          onChange?.(event);
        }}
        onBlur={onBlur}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        id={id}
        className={`${selectBase} ${error ? errorRing : ""} ${className}`}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        onBlur={(event) => {
          if (!wrapperRef.current?.contains(event.relatedTarget as Node)) {
            onBlur?.({ target: selectRef.current, currentTarget: selectRef.current } as unknown as FocusEvent<HTMLSelectElement>);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`min-w-0 truncate ${!selectedValue && placeholder ? "text-slate-400" : ""}`}>{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950"
          role="listbox"
        >
          {searchable && (
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
              <input
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 sm:text-sm"
                placeholder="Type to search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoFocus
              />
            </div>
          )}
          {filteredOptions.map((option) => {
            const isDisabled = "disabled" in option && option.disabled;
            const isSelected = option.value === selectedValue;
            return (
              <button
                className={`block w-full px-3 py-2 text-left text-base sm:text-sm ${
                  isSelected
                    ? "bg-emerald-700 text-white"
                    : "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-900"
                } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                disabled={isDisabled}
                aria-selected={isSelected}
                onClick={() => chooseValue(option.value)}
              >
                <span className="block break-words">{option.label}</span>
              </button>
            );
          })}
          {filteredOptions.length === 0 && (
            <div className="px-3 py-3 text-sm text-slate-500">No matching options</div>
          )}
        </div>
      )}
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
  searchable?: boolean;
}

export function SelectField({ label, error, id, options, placeholder, searchable, ...props }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} error={error} htmlFor={id}>
      <SelectControl id={id} error={error} options={options} placeholder={placeholder} searchable={searchable} {...props} />
    </FieldWrapper>
  );
}

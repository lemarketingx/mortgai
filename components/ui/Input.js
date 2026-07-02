/**
 * FINZO Input — Design System v1.0
 * States: default | active (focus) | error | disabled
 *
 * Rules:
 * - Always paired with a visible <label> — never placeholder-only
 * - Money inputs use font-mono with tnum for tabular alignment
 * - Validation fires on blur, never on keydown
 */

const INPUT_BASE =
  "w-full px-[14px] py-3 border rounded-pro-md bg-pro-white font-mono text-[15px] text-pro-ink transition-[border-color,box-shadow] outline-none placeholder:text-pro-mute disabled:bg-pro-paper disabled:text-pro-mute disabled:cursor-not-allowed";

const INPUT_STATES = {
  default: "border-pro-line focus:border-pro-ink focus:ring-2 focus:ring-pro-cobalt-l",
  error:   "border-danger-500 ring-2 ring-danger-500/15",
};

export function FieldLabel({ children, required, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] text-pro-ink-2 mb-[6px]">
      {children}
      {required && <span className="text-danger-500 mr-1" aria-hidden="true">*</span>}
    </label>
  );
}

export function FieldHelper({ children, error = false }) {
  if (!children) return null;
  return (
    <p className={`mt-[6px] font-mono text-[11.5px] tracking-[0.04em] ${error ? "text-danger-500" : "text-pro-mute"}`}>
      {children}
    </p>
  );
}

export function TextInput({
  id,
  label,
  helper,
  error,
  required = false,
  disabled = false,
  className = "",
  ...props
}) {
  const stateClass = error ? INPUT_STATES.error : INPUT_STATES.default;
  return (
    <div className="grid gap-0">
      {label && <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>}
      <input
        id={id}
        className={[INPUT_BASE, stateClass, className].filter(Boolean).join(" ")}
        disabled={disabled}
        required={required}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={helper || error ? `${id}-helper` : undefined}
        {...props}
      />
      {(helper || error) && (
        <FieldHelper id={`${id}-helper`} error={!!error}>
          {error || helper}
        </FieldHelper>
      )}
    </div>
  );
}

export function MoneyInputFinzo({
  id,
  label,
  helper,
  error,
  required = false,
  disabled = false,
  className = "",
  ...props
}) {
  const stateClass = error ? INPUT_STATES.error : INPUT_STATES.default;
  return (
    <div className="grid gap-0">
      {label && <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>}
      <div className={`flex items-center border rounded-pro-md bg-pro-white transition-[border-color,box-shadow] ${error ? "border-danger-500 ring-2 ring-danger-500/15" : "border-pro-line focus-within:border-pro-ink focus-within:ring-2 focus-within:ring-pro-cobalt-l"}`}>
        <span className="px-3 font-mono text-[13px] text-pro-mute select-none shrink-0">₪</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className={[
            "flex-1 min-w-0 py-3 pl-2 pr-3 font-mono text-[15px] text-pro-ink bg-transparent outline-none placeholder:text-pro-mute disabled:text-pro-mute tabular-nums",
            disabled ? "cursor-not-allowed" : "",
            className,
          ].filter(Boolean).join(" ")}
          disabled={disabled}
          required={required}
          aria-invalid={error ? "true" : undefined}
          style={{ fontFeatureSettings: '"tnum" 1' }}
          {...props}
        />
      </div>
      {(helper || error) && (
        <FieldHelper error={!!error}>
          {error || helper}
        </FieldHelper>
      )}
    </div>
  );
}

export function SelectInput({
  id,
  label,
  helper,
  error,
  required = false,
  disabled = false,
  children,
  className = "",
  ...props
}) {
  const stateClass = error ? INPUT_STATES.error : INPUT_STATES.default;
  return (
    <div className="grid gap-0">
      {label && <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>}
      <select
        id={id}
        className={[INPUT_BASE, stateClass, "cursor-pointer appearance-none", className].filter(Boolean).join(" ")}
        disabled={disabled}
        required={required}
        {...props}
      >
        {children}
      </select>
      {(helper || error) && (
        <FieldHelper error={!!error}>
          {error || helper}
        </FieldHelper>
      )}
    </div>
  );
}

export function PhoneInput({
  id,
  label,
  helper,
  error,
  required = false,
  disabled = false,
  className = "",
  ...props
}) {
  const stateClass = error ? INPUT_STATES.error : INPUT_STATES.default;
  return (
    <div className="grid gap-0">
      {label && <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>}
      <input
        id={id}
        type="tel"
        inputMode="tel"
        dir="ltr"
        className={[INPUT_BASE, stateClass, "text-right", className].filter(Boolean).join(" ")}
        disabled={disabled}
        required={required}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {(helper || error) && (
        <FieldHelper error={!!error}>
          {error || helper}
        </FieldHelper>
      )}
    </div>
  );
}

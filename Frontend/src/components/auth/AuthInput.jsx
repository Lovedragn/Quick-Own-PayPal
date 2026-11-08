
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function AuthInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  required = true,
  autoComplete,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  const inputType =
    isPassword && showPassword ? "text" : type;

  return (
    <div className="auth-field">
      <label>{label}</label>

      <div className="auth-input-wrapper">

        {Icon && (
          <Icon
            className="auth-input-icon"
            size={19}
          />
        )}

        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          minLength={isPassword ? 8 : undefined}
        />

        {isPassword && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={
              showPassword ? "Hide password" : "Show password"
            }
          >
            {showPassword ? (
              <EyeOff size={19} />
            ) : (
              <Eye size={19} />
            )}
          </button>
        )}

      </div>
    </div>
  );
}

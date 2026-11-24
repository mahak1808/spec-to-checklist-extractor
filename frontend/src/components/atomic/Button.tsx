import type React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "common" | "outline" | "success";
  disabled?: boolean;
  className?: string;
}

const variantClasses = {
  common:
    "px-1 py-2 rounded-md text-xs font-semibold transition disabled:opacity-50",
  primary: "bg-brand-charcoal text-brand-offwhite hover:bg-brand-charcoal/80",
  secondary:
    "bg-brand-offwhite text-amber-800 border border-amber-300 hover:bg-amber-100",
  outline:
    " text-brand-charcoal border border-brand-charcoal/30 hover:bg-brand-grey/10",
  success: "bg-green-700 text-brand-offwhite hover:bg-green-800",
};

function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${variantClasses.common} ${variantClasses[variant]} ${className} ${children ? "px-3" : ""}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;

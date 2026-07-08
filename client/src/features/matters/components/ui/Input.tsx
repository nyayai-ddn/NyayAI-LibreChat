import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={clsx(
          "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder-gray-400",
          "focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500",
          error && "border-red-400 focus:border-red-400 focus:ring-red-400",
          className
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

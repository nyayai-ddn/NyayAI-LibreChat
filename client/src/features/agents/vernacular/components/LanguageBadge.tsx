type Props = {
  languageLabel: string;
  className?: string;
};

export default function LanguageBadge({ languageLabel, className = '' }: Props) {
  if (!languageLabel || languageLabel === 'English') {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded border border-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:border-amber-500 dark:text-amber-400 ${className}`}
      title={`Document language: ${languageLabel}`}
    >
      {languageLabel}
    </span>
  );
}

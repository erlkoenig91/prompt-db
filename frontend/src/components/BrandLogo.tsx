interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
}

export default function BrandLogo({ size = "md", showText = true, subtitle }: BrandLogoProps) {
  return (
    <div className={`brand-logo brand-logo--${size}`}>
      <img src="/logo.png" alt="Prompt DB Logo" className="brand-logo-image" />
      {showText && (
        <div className="brand-logo-text">
          <span className="brand-logo-title">Prompt DB</span>
          {subtitle && <span className="brand-logo-subtitle muted">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function Card({ children, title, subtitle, className = "", ...props }: CardProps) {
  return (
    <div className={`card ${className}`} {...props}>
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

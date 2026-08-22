import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] text-accent-foreground shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:brightness-[1.04]",
        secondary:
          "border border-border-strong bg-surface text-foreground shadow-[var(--shadow-xs)] hover:bg-surface-sunken",
        ghost: "text-foreground hover:bg-surface-sunken",
        destructive:
          "bg-status-critical text-white shadow-[var(--shadow-xs)] hover:opacity-90",
        pass: "bg-status-pass text-white shadow-[var(--shadow-xs)] hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-14 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { href?: string };

export function Button({
  className,
  variant,
  size,
  href,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        {props.children}
      </Link>
    );
  }
  return <button className={classes} {...props} />;
}

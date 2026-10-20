import * as React from "react"
import { cn } from "@core/presentation/utils"

/** `required` only draws the ` *` marker; the field owner must still set `required`/`aria-required` on the input. */
export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean };

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
      {required && <span aria-hidden="true" className="text-destructive"> *</span>}
    </label>
  )
)
Label.displayName = "Label"

export { Label }

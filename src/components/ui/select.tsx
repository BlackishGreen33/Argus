"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";
import {
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectStateContext,
  SelectValue as AriaSelectValue,
} from "react-aria-components";

import { cn } from "@/utils/cn";

type SelectProps = Omit<React.ComponentProps<typeof AriaSelect>, "selectedKey" | "onSelectionChange"> & {
  value?: string;
  onValueChange?: (value: string) => void;
};

function Select({ value, onValueChange, ...props }: SelectProps) {
  return (
    <AriaSelect
      data-slot="select"
      selectedKey={value ?? null}
      onSelectionChange={(key) => {
        if (key !== null) onValueChange?.(String(key));
      }}
      {...props}
    />
  );
}

function SelectValue({
  className,
  placeholder: _placeholder,
  ...props
}: React.ComponentProps<typeof AriaSelectValue> & {
  placeholder?: string;
}) {
  return <AriaSelectValue data-slot="select-value" className={cn("line-clamp-1", className)} {...props} />;
}

function SelectTrigger({
  className,
  size: _size,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AriaButton>, "children"> & {
  size?: "sm" | "default";
  children?: React.ReactNode;
}) {
  return (
    <AriaButton
      data-slot="select-trigger"
      className={cn(
        "border-input focus-visible:border-ring focus-visible:ring-ring/50 data-[invalid]:border-destructive relative flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
        typeof className === "string" ? className : undefined,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0" />
    </AriaButton>
  );
}

function SelectContent({ className, children, ...props }: React.ComponentProps<typeof Popover>) {
  const state = React.useContext(SelectStateContext);

  return (
    <Popover
      isOpen={state?.isOpen}
      data-slot="select-content"
      placement="bottom start"
      offset={5}
      className={cn(
        "z-50 min-w-[var(--trigger-width)] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1 text-[var(--ink)] shadow-[var(--shadow)] outline-none",
        "[&[data-entering]]:animate-in [&[data-entering]]:fade-in-0 [&[data-entering]]:zoom-in-95",
        "[&[data-exiting]]:animate-out [&[data-exiting]]:fade-out-0 [&[data-exiting]]:zoom-out-95",
        className,
      )}
      {...props}
    >
      <ListBox data-slot="select-listbox" className="max-h-[min(320px,50vh)] overflow-y-auto outline-none">
        {children}
      </ListBox>
    </Popover>
  );
}

function SelectItem({
  className,
  value,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ListBoxItem>, "children"> & {
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <ListBoxItem
      id={value}
      textValue={typeof children === "string" ? children : value}
      data-slot="select-item"
      className={cn(
        "relative flex min-h-9 w-full cursor-default items-center rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none",
        "data-[focused]:bg-[var(--surface-muted)] data-[focused]:text-[var(--ink)] data-[selected]:bg-[var(--accent-soft)] data-[selected]:font-semibold data-[selected]:text-[var(--accent-deep)]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        typeof className === "string" ? className : undefined,
      )}
      {...props}
    >
      {({ isSelected }) => (
        <>
          <span className="min-w-0 flex-1 truncate">{children}</span>
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
            {isSelected ? <CheckIcon className="size-4" /> : null}
          </span>
        </>
      )}
    </ListBoxItem>
  );
}

function SelectGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="select-group" className={cn("p-1", className)} {...props} />;
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="select-label" className={cn("px-2 py-1 text-xs text-[var(--ink-soft)]", className)} {...props} />
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"hr">) {
  return (
    <hr
      data-slot="select-separator"
      className={cn("my-1 border-0 border-t border-[var(--line)]", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton() {
  return null;
}

function SelectScrollDownButton() {
  return null;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};

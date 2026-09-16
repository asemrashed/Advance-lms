"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { LuChevronDown as ChevronDown } from 'react-icons/lu'

import { cn } from "@/lib/utils"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down transition-[height,opacity] duration-300 ease-in-out",
      className
    )}
    {...props}
  />
))
CollapsibleContent.displayName = CollapsiblePrimitive.CollapsibleContent.displayName

const CollapsibleHeader = React.forwardRef<
  React.ElementRef<typeof CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsibleTrigger> & {
    className?: string
    children: React.ReactNode
  }
>(({ className, children, ...props }, ref) => (
  <CollapsibleTrigger
    ref={ref}
    className={cn(
      "flex w-full flex-col items-start gap-2 rounded-md transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
      "data-[state=open]:[&>div>svg]:rotate-180",
      className
    )}
    {...props}
  >
    <div className="flex w-full items-center justify-between">
      {children}
      <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-300 ease-in-out shrink-0" />
    </div>
  </CollapsibleTrigger>
))
CollapsibleHeader.displayName = "CollapsibleHeader"

export { Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsibleHeader }


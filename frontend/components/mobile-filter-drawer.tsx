"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GroupedCollege } from "@/lib/predict/types"

interface FilterOption {
  value: string
  label: string
}

interface MobileFilterDrawerProps {
  colleges: GroupedCollege[]
  filters: {
    degree: Set<string>
    branch: Set<string>
    duration: Set<string>
    college: Set<string>
    collegeType: Set<string>
  }
  onFilterChange: (filterType: string, value: string) => void
  onClearFilters: () => void
}

export function MobileFilterDrawer({ colleges, filters, onFilterChange, onClearFilters }: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("branch")

  // Extract unique values for filters
  const uniqueCollegeTypes = Array.from(new Set(colleges.map((c) => c.institute_type))).sort()
  const uniqueColleges = Array.from(new Set(colleges.map((c) => c.institute))).sort()

  // Extract unique branches from all colleges
  const uniqueBranches = Array.from(
    new Set(colleges.flatMap((college) => college.departments.map((d) => d.department))),
  ).sort()

  // Extract degree options
  const degreeOptions: FilterOption[] = [
    { value: "B.Tech", label: "Bachelor of Technology" },
    { value: "B.Sc", label: "Bachelor of Science" },
    { value: "B.Pharm", label: "Bachelor of Pharmaceutics" },
    { value: "B.Des", label: "Bachelor of Design" },
    { value: "B.Plan", label: "Bachelor of Planning" },
    { value: "B.Tech", label: "B. Tech / B. Tech (Hons.)" },
    { value: "B.Arch", label: "Bachelor of Architecture" },
    { value: "B.Tech-M.Tech", label: "Bachelor and Master of Technology (Dual Degree)" },
    { value: "Int.M.Tech", label: "Integrated Master of Technology" },
  ]

  // Count total active filters
  const totalActiveFilters =
    filters.degree.size + filters.branch.size + filters.duration.size + filters.college.size + filters.collegeType.size

  // Get filter options based on active category
  const getFilterOptions = (): FilterOption[] => {
    switch (activeCategory) {
      case "degree":
        return [
          { value: "B.Tech", label: "Bachelor of Technology" },
          { value: "B.Sc", label: "Bachelor of Science" },
          { value: "B.Pharm", label: "Bachelor of Pharmaceutics" },
          { value: "B.Des", label: "Bachelor of Design" },
          { value: "B.Plan", label: "Bachelor of Planning" },
          { value: "B.Arch", label: "Bachelor of Architecture" },
          { value: "B.Tech-M.Tech", label: "Bachelor and Master of Technology (Dual Degree)" },
          { value: "Int.M.Tech", label: "Integrated Master of Technology" },
        ]
      case "branch":
        // Return some default branches if uniqueBranches is empty
        return uniqueBranches.length > 0
          ? uniqueBranches.map((branch) => ({ value: branch, label: branch }))
          : [
              { value: "Computer Science and Engineering", label: "Computer Science and Engineering" },
              {
                value: "Electronics and Communication Engineering",
                label: "Electronics and Communication Engineering",
              },
              { value: "Mechanical Engineering", label: "Mechanical Engineering" },
              { value: "Civil Engineering", label: "Civil Engineering" },
            ]
      case "duration":
        return [
          { value: "4 Years", label: "4 Years" },
          { value: "5 Years", label: "5 Years" },
        ]
      case "college":
        // Return some default colleges if uniqueColleges is empty
        return uniqueColleges.length > 0
          ? uniqueColleges.map((college) => ({ value: college, label: college }))
          : [
              { value: "IIT Delhi", label: "IIT Delhi" },
              { value: "IIT Bombay", label: "IIT Bombay" },
              { value: "NIT Trichy", label: "NIT Trichy" },
              { value: "IIIT Hyderabad", label: "IIIT Hyderabad" },
            ]
      case "collegetype":
        // Make sure these values match exactly with what's in your database
        // If your database uses different values (e.g., "GFTI" vs "GFTIs"),
        // you'll need to transform them when applying filters
        return [
          { value: "IIT", label: "IIT - Indian Institute of Technology" },
          { value: "NIT", label: "NIT - National Institute of Technology" },
          { value: "IIIT", label: "IIIT - Indian Institute of Information Technology" },
          { value: "GFTIs", label: "GFTIs - Government Funded Technical Institutes" },
        ]
      default:
        return []
    }
  }

  // Check if a filter option is selected
  const isSelected = (value: string): boolean => {
    switch (activeCategory) {
      case "degree":
        return filters.degree.has(value)
      case "branch":
        return filters.branch.has(value)
      case "duration":
        return filters.duration.has(value)
      case "college":
        return filters.college.has(value)
      case "collegetype":
        return filters.collegeType.has(value) // Changed from collegetype to collegeType to match parent
      default:
        return false
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default" className="md:hidden" onClick={() => setOpen(true)}>
          <Filter className="mr-2 h-4 w-4" />
          Filter
          {totalActiveFilters > 0 && (
            <span className="ml-1 bg-primary-foreground text-primary rounded-full w-5 h-5 text-xs flex items-center justify-center">
              {totalActiveFilters}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[80vh] p-0 flex flex-col rounded-t-xl border-t border-x"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 300ms ease-out",
        }}
      >
        <div className="flex-none">
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto my-3"></div>
        </div>
        <SheetHeader className="px-4 py-3 border-b flex-none">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-base font-medium">Filters ({totalActiveFilters})</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="rounded-full h-10 w-10 border"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        <div className="flex flex-1 overflow-hidden">
          {/* Filter categories */}
          <div className="w-1/3 border-r overflow-y-auto">
            {["Branch", "College", "College Type"].map((category) => {
              const key = category.toLowerCase().replace(/\s+/g, "")
              return (
                <div
                  key={key}
                  className={cn(
                    "px-3 py-3 cursor-pointer text-sm transition-colors",
                    activeCategory === key ? "filter-category-active" : "filter-category-idle",
                  )}
                  onClick={() => setActiveCategory(key)}
                >
                  {category}
                </div>
              )
            })}
          </div>

          {/* Filter options */}
          <div className="w-2/3 p-4 overflow-y-auto">
            <h3 className="text-base font-medium mb-2 uppercase">{activeCategory.toUpperCase()}</h3>
            <div className="space-y-4">
              {getFilterOptions().map((option) => (
                <div key={option.value} className="flex items-start space-x-2">
                  <Checkbox
                    id={`${activeCategory}-${option.value}`}
                    checked={isSelected(option.value)}
                    onCheckedChange={() => {
                      // Map collegetype to collegeType for the parent component
                      const filterType = activeCategory === "collegetype" ? "collegeType" : activeCategory
                      onFilterChange(filterType, option.value)
                    }}
                    className="mt-1"
                  />
                  <Label
                    htmlFor={`${activeCategory}-${option.value}`}
                    className="text-[10px] sm:text-xs leading-tight cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

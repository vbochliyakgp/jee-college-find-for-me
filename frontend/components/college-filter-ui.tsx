"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Filter, RefreshCw } from "lucide-react"

interface GroupedCollege {
  institute: string
  institute_type: string
  state: string
  NIRF: string | null
  departments: {
    department: string
    opening_rank: number
    closing_rank: number
    quota: string
    gender: string
    seat_type: string
  }[]
}

interface CollegeFilterUIProps {
  colleges: GroupedCollege[]
  onFilteredCollegesChange: (colleges: GroupedCollege[]) => void
  onNewPrediction: () => void
}

export function CollegeFilterUI({ colleges, onFilteredCollegesChange, onNewPrediction }: CollegeFilterUIProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    degree: new Set<string>(),
    branch: new Set<string>(),
    duration: new Set<string>(),
    college: new Set<string>(),
    collegeType: new Set<string>(),
  })

  // Extract unique values for filters
  const uniqueCollegeTypes = Array.from(new Set(colleges.map((c) => c.institute_type))).sort()
  const uniqueColleges = Array.from(new Set(colleges.map((c) => c.institute))).sort()

  // Extract unique branches from all colleges
  const uniqueBranches = Array.from(
    new Set(colleges.flatMap((college) => college.departments.map((dept) => dept.department))),
  ).sort()

  // Extract degree and duration from branch names
  const uniqueDegrees = Array.from(
    new Set(
      uniqueBranches
        .map((branch) => {
          const match = branch.match(/^([A-Za-z.]+)/)
          return match ? match[0].trim() : ""
        })
        .filter(Boolean),
    ),
  ).sort()

  const uniqueDurations = Array.from(
    new Set(
      uniqueBranches
        .map((branch) => {
          const match = branch.match(/(\d+)\s*Years?$/i)
          return match ? `${match[1]} Years` : ""
        })
        .filter(Boolean),
    ),
  ).sort((a, b) => {
    const numA = Number.parseInt(a.split(" ")[0])
    const numB = Number.parseInt(b.split(" ")[0])
    return numA - numB
  })

  // Apply filters whenever they change
  useEffect(() => {
    let filteredResults = [...colleges]

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filteredResults = filteredResults.filter((college) => {
        // Search in college name
        if (college.institute.toLowerCase().includes(query)) return true

        // Search in departments
        return college.departments.some((dept) => dept.department.toLowerCase().includes(query))
      })
    }

    // Apply college type filter
    if (filters.collegeType.size > 0) {
      filteredResults = filteredResults.filter((college) => filters.collegeType.has(college.institute_type))
    }

    // Apply college name filter
    if (filters.college.size > 0) {
      filteredResults = filteredResults.filter((college) => filters.college.has(college.institute))
    }

    // Apply degree filter
    if (filters.degree.size > 0) {
      filteredResults = filteredResults
        .map((college) => ({
          ...college,
          departments: college.departments.filter((dept) => {
            const match = dept.department.match(/^([A-Za-z.]+)/)
            const degree = match ? match[0].trim() : ""
            return filters.degree.has(degree)
          }),
        }))
        .filter((college) => college.departments.length > 0)
    }

    // Apply branch filter
    if (filters.branch.size > 0) {
      filteredResults = filteredResults
        .map((college) => ({
          ...college,
          departments: college.departments.filter((dept) => filters.branch.has(dept.department)),
        }))
        .filter((college) => college.departments.length > 0)
    }

    // Apply duration filter
    if (filters.duration.size > 0) {
      filteredResults = filteredResults
        .map((college) => ({
          ...college,
          departments: college.departments.filter((dept) => {
            const match = dept.department.match(/(\d+)\s*Years?$/i)
            const duration = match ? `${match[1]} Years` : ""
            return filters.duration.has(duration)
          }),
        }))
        .filter((college) => college.departments.length > 0)
    }

    onFilteredCollegesChange(filteredResults)
  }, [searchQuery, filters, colleges, onFilteredCollegesChange])

  // Toggle a filter value
  const toggleFilter = (filterType: keyof typeof filters, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev }
      const filterSet = new Set(prev[filterType])

      if (filterSet.has(value)) {
        filterSet.delete(value)
      } else {
        filterSet.add(value)
      }

      newFilters[filterType] = filterSet
      return newFilters
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setFilters({
      degree: new Set<string>(),
      branch: new Set<string>(),
      duration: new Set<string>(),
      college: new Set<string>(),
      collegeType: new Set<string>(),
    })
  }

  return (
    <div className="space-y-4">
      {/* Search and action buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 text-xs sm:text-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search colleges or branches..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={onNewPrediction}>
            <RefreshCw className="mr-2 h-4 w-4" />
            New Prediction
          </Button>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Branch Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3">
              <Filter className="mr-2 h-3 w-3" />
              Branch
              {filters.branch.size > 0 && (
                <span className="ml-1 rounded-full bg-primary w-4 h-4 text-[10px] flex items-center justify-center text-primary-foreground">
                  {filters.branch.size}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
            {uniqueBranches.sort().map((branch) => (
              <DropdownMenuCheckboxItem
                key={branch}
                checked={filters.branch.has(branch)}
                onCheckedChange={() => toggleFilter("branch", branch)}
              >
                {branch}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* College Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3">
              <Filter className="mr-2 h-3 w-3" />
              College
              {filters.college.size > 0 && (
                <span className="ml-1 rounded-full bg-primary w-4 h-4 text-[10px] flex items-center justify-center text-primary-foreground">
                  {filters.college.size}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
            {uniqueColleges.sort().map((college) => (
              <DropdownMenuCheckboxItem
                key={college}
                checked={filters.college.has(college)}
                onCheckedChange={() => toggleFilter("college", college)}
              >
                {college}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* College Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3">
              <Filter className="mr-2 h-3 w-3" />
              College Type
              {filters.collegeType.size > 0 && (
                <span className="ml-1 rounded-full bg-primary w-4 h-4 text-[10px] flex items-center justify-center text-primary-foreground">
                  {filters.collegeType.size}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {uniqueCollegeTypes.sort().map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={filters.collegeType.has(type)}
                onCheckedChange={() => toggleFilter("collegeType", type)}
              >
                {type}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters Button */}
        {(searchQuery || filters.branch.size > 0 || filters.college.size > 0 || filters.collegeType.size > 0) && (
          <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}

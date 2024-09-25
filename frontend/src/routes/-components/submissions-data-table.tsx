import * as React from "react"

import { Button } from "@/components/ui/button"

import {
  ColumnDef,
  flexRender,
  getPaginationRowModel,
  getCoreRowModel,
  ColumnFiltersState,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Input } from "@/components/ui/input"
import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchby: string[]
  initialState?: {
    columnVisibility?: Record<string, boolean>
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchby,
  initialState,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  console.log("data", data)
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    initialState: initialState? initialState : {
      sorting,
      columnFilters,
    },
    state: {
      sorting,
      columnFilters,
    },
  })
  const currentPageIdx = table.getState().pagination?.pageIndex
  const currentPageSize = table.getState().pagination?.pageSize
  const currentCurrentRowSize = table.getRowModel().rows.length
  const topRowIdx = currentPageIdx * currentPageSize + 1
  const bottomRowIdx = topRowIdx + currentCurrentRowSize - 1

  const [locationListType, setlocationListType] = React.useState<
    "rows" | "cards"
  >("rows")
  const maxPage = 4
  const [imgPage, setImgPage] = React.useState<number>(1)

  return (
    <div className="overflow-x-auto flex flex-col">
      <div className="flex items-center py-4  pr-2">
        {table.getRowModel().rows.length > 0 && (
          <div className="flex items-center justify-end space-x-2 py-4 pr-2">
            <div>
              <span className="text-sm text-muted-foreground">
                {/* Showing Submissions {min}-{max} of total*/}
                Showing {topRowIdx}-{bottomRowIdx} of{" "}
                {table.getRowCount() ?? "0"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        )}
        <div className="ml-auto"></div>
        <div
          className={cn(
            "flex items-center gap-0 mr-2",
            (locationListType === "rows" || table.getRowModel().rows.length === 0) &&
              "hidden" 
          )}
        >
          {Array.from({ length: maxPage }, (_, i) => i + 1).map(
            (imgPageOption) => (
              <Button
                variant="outline"
                size="sm"
                key={imgPageOption}
                className={cn(
                  "rounded-none",
                  imgPageOption === 1 && "rounded-l-md",
                  imgPageOption === maxPage && "rounded-r-md"
                )}
                onClick={() => setImgPage(imgPageOption)}
                disabled={imgPage === imgPageOption}
              >
                {imgPageOption}
              </Button>
            )
          )}
        </div>
        <div className="flex items-center gap-0 mr-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-r-none"
            onClick={() => setlocationListType("rows")}
            disabled={locationListType === "rows"}
          >
            Table
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-l-none"
            onClick={() => setlocationListType("cards")}
            disabled={locationListType === "cards"}
          >
            Cards
          </Button>
        </div>
        <Input
          placeholder={`Search by ${searchby.join(", ")}`}
          value={
            (table.getColumn(searchby[0])?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn(searchby[0])?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      {locationListType === "rows" ? (
        <RenderTableAsTables table={table} />
      ) : (
        <RenderTableAsCards table={table} imgPage={imgPage} />
      )}
    </div>
  )
}

function RenderTableAsTables({
  table,
}: {
  table: ReturnType<typeof useReactTable>
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table?.columns?.length ?? 12}
                className="h-24 text-center"
              >
                {
                  // if filter is applied
                  table.getColumn("student")?.getFilterValue()
                    ? "No submissions found for filter."
                    : "No submissions found."
                }
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function RenderTableAsCards({
  table,
  imgPage,
}: {
  table: ReturnType<typeof useReactTable>
  imgPage: number
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5 mx-12">
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row) => (
          <div
            key={row.id}
            className="rounded-md border"
            data-state={row.getIsSelected() && "selected"}
          >
            <Link
              to="/submissions/$submissionId"
              params={{ submissionId: row.original.id }}
            >
              <img
                src={row.original.papersubmission_images[imgPage - 1].image}
                alt="submission"
                className="w-full object-cover rounded-md"
                height="110"
                width="85"
                loading="lazy"
              />
            </Link>
          </div>
        ))
      ) : (
        <div className="h-24 text-center col-span-full m-4">
          {
            // if filter is applied
            table.getColumn("student")?.getFilterValue()
              ? "No submissions found for filter."
              : "No submissions found."
          }
        </div>
      )}
    </div>
  )
}

import React from "react";
import type { Drink } from "~/types/bac";
import type { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface EditDrinksTableProps {
  drinksQuery: ReturnType<typeof api.post.getDrinks.useQuery>;
  selectedDrink: Drink | null;
  setSelectedDrink: (drink: Drink | null) => void;
}

export function EditDrinksTable({ drinksQuery, selectedDrink, setSelectedDrink }: EditDrinksTableProps) {
  return (
    <div className="mb-4 flex flex-col min-h-0 flex-grow">
             <div className="overflow-auto rounded-md border border-[#444] bg-[#232323] custom-scrollbar">
        <Table>
                     <TableHeader>
             <TableRow className="border-[#444] hover:bg-[#444]/50">
               <TableHead className="text-[#e5e5e5] font-medium text-center border-r border-[#444]">#</TableHead>
               <TableHead className="text-[#e5e5e5] font-medium text-center">Standards</TableHead>
               <TableHead className="text-[#e5e5e5] font-medium text-center">Time</TableHead>
             </TableRow>
           </TableHeader>
          <TableBody>
                         {drinksQuery.isLoading && (
               <TableRow>
                 <TableCell colSpan={3} className="text-center text-[#e5e5e5]/60">
                   Loading...
                 </TableCell>
               </TableRow>
             )}
             {Array.isArray(drinksQuery.data) && drinksQuery.data.length === 0 && (
               <TableRow>
                 <TableCell colSpan={3} className="text-center text-[#e5e5e5]/60">
                   No drinks logged yet.
                 </TableCell>
               </TableRow>
             )}
            {(drinksQuery.data as Drink[] | undefined)?.map((drink, index) => {
              const isSelected = selectedDrink?.id === drink.id;
              
              return (
                                 <TableRow 
                   key={drink.id} 
                   className={`border-[#444] hover:bg-[#444]/50 cursor-pointer transition ${
                     isSelected ? 'bg-[#666]' : ''
                   }`}
                   onClick={() => {
                     setSelectedDrink(isSelected ? null : drink);
                   }}
                 >
                   <TableCell className="text-[#e5e5e5] font-medium text-center border-r border-[#444] w-[50px]">
                     {index + 1}
                   </TableCell>
                   <TableCell className="text-[#e5e5e5] font-medium text-center">
                     {drink.standards}
                   </TableCell>
                   <TableCell className="text-[#e5e5e5]/70 text-center">
                     {new Date(drink.finishedAt).toLocaleTimeString([], { 
                       hour: '2-digit', 
                       minute: '2-digit',
                     })}
                   </TableCell>
                 </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 
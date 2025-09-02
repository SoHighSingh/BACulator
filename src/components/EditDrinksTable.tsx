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
             <div className="overflow-auto rounded-md border border-white/20 bg-white/10 backdrop-blur-sm custom-scrollbar">
        <Table>
                     <TableHeader>
             <TableRow className="border-white/20 hover:bg-white/15">
               <TableHead className="text-white font-medium text-center border-r border-white/20">#</TableHead>
               <TableHead className="text-white font-medium text-center">Standards</TableHead>
               <TableHead className="text-white font-medium text-center">Time</TableHead>
             </TableRow>
           </TableHeader>
          <TableBody>
                         {drinksQuery.isLoading && (
               <TableRow>
                 <TableCell colSpan={3} className="text-center text-white/60">
                   Loading...
                 </TableCell>
               </TableRow>
             )}
             {Array.isArray(drinksQuery.data) && drinksQuery.data.length === 0 && (
               <TableRow>
                 <TableCell colSpan={3} className="text-center text-white/60">
                   No drinks logged yet.
                 </TableCell>
               </TableRow>
             )}
            {(drinksQuery.data as Drink[] | undefined)?.map((drink, index) => {
              const isSelected = selectedDrink?.id === drink.id;
              
              return (
                                 <TableRow 
                   key={drink.id} 
                   className={`border-white/20 hover:bg-white/15 cursor-pointer transition ${
                     isSelected ? 'bg-white/20' : ''
                   }`}
                   onClick={() => {
                     setSelectedDrink(isSelected ? null : drink);
                   }}
                 >
                   <TableCell className="text-white font-medium text-center border-r border-white/20 w-[50px]">
                     {index + 1}
                   </TableCell>
                   <TableCell className="text-white font-medium text-center">
                     {drink.standards}
                   </TableCell>
                   <TableCell className="text-white/70 text-center">
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
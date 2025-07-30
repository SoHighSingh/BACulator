import React from "react";
import { calculateDrinkContribution } from "~/lib/bac-calculator";
import type { Drink } from "~/types/bac";
import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface DrinksListProps {
  drinksQuery: ReturnType<typeof api.post.getDrinks.useQuery>;
  userWeight: number | null;
  userSex: string | null;
}

export function DrinksList({ drinksQuery, userWeight, userSex }: DrinksListProps) {
  const now = new Date();

  return (
    <div className="mb-4 flex flex-col min-h-0 flex-grow">
             <div className="overflow-auto max-h-60 rounded-md border border-[#444] bg-[#232323] custom-scrollbar">
        <Table>
                     <TableHeader>
             <TableRow className="border-[#444] hover:bg-[#444]/50">
               <TableHead className="text-[#e5e5e5] font-medium text-center border-r border-[#444]">#</TableHead>
               <TableHead className="text-[#e5e5e5] font-medium text-center">Standards</TableHead>
               <TableHead className="text-[#e5e5e5] font-medium text-center">Time</TableHead>
               <TableHead className="text-[#e5e5e5] font-medium text-center">Status</TableHead>
             </TableRow>
           </TableHeader>
          <TableBody>
                         {drinksQuery.isLoading && (
               <TableRow>
                 <TableCell colSpan={4} className="text-center text-[#e5e5e5]/60">
                   Loading...
                 </TableCell>
               </TableRow>
             )}
             {Array.isArray(drinksQuery.data) && drinksQuery.data.length === 0 && (
               <TableRow>
                 <TableCell colSpan={4} className="text-center text-[#e5e5e5]/60">
                   No drinks logged yet.
                 </TableCell>
               </TableRow>
             )}
                         {(drinksQuery.data as Drink[] | undefined)?.map((drink, index) => {
               let drinkStatus: null | boolean = null;
               let drinkBAC = 0;
               if (userWeight && userSex) {
                 const contrib = calculateDrinkContribution(drink, userWeight, userSex, now);
                 drinkStatus = contrib.isAbsorbing;
                 drinkBAC = contrib.bac;
               }
               
                return (
                 <TableRow key={drink.id} className="border-[#444] hover:bg-[#444]/50">
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
                   <TableCell className="text-center">
                     {drinkStatus !== null ? (
                       drinkStatus ? (
                         <span className="text-red-500 text-xs font-semibold">Absorbing</span>
                       ) : drinkBAC > 0.001 ? (
                         <span className="text-green-500 text-xs font-semibold">Eliminating</span>
                       ) : (
                         <span className="text-gray-400 text-xs font-semibold">Eliminated</span>
                       )
                     ) : (
                       <span className="text-[#e5e5e5]/50 text-xs">-</span>
                     )}
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
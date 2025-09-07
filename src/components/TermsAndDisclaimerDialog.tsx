import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";
import { Button } from "./ui/button";

interface TermsAndDisclaimerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function TermsAndDisclaimerDialog({ isOpen, onClose, onContinue }: TermsAndDisclaimerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="bg-black/40 backdrop-blur-sm border border-white/10 max-w-[45vh] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white text-2xl text-center">Terms and Disclaimer</DialogTitle>
          <DialogDescription className="text-white/80">
            Important Notice – Please Read Carefully
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1 text-white/90 text-base space-y-6 custom-scrollbar">
          <div>
            <h3 className="font-semibold text-white mb-2">1. For Informational Use Only</h3>
            <p>
              This Blood Alcohol Concentration (BAC) calculator provides an approximate estimate only, based on limited input parameters. It does not account for numerous individual factors—including your metabolism, food intake, medication, body composition, health conditions, gender, and more—that can significantly influence your actual BAC. Therefore, it cannot determine your true level of intoxication with any certainty.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-2">2. Not a Substitute for Professional Tools or Advice</h3>
            <p>
              This calculator is not a legal, medical, or diagnostic tool. It should never be relied upon to assess your fitness to drive, operate machinery, or perform any safety-sensitive task. Only a certified breathalyser test or medical analysis can provide an accurate measurement of BAC.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-2">3. Legal BAC Limits in Australia</h3>
            <p>
              In Australia, the general legal BAC limit for fully licensed drivers is 0.05%. However, several categories of drivers—including those holding learner, provisional, probationary, or commercial licences (such as taxi, bus, or heavy vehicle drivers)—are subject to a strict zero-BAC requirement (0.00%).
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-2">4. No Assurances—Use Caution</h3>
            <p className="mb-2">By proceeding, you acknowledge that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The information provided may contain inaccuracies or errors.</li>
              <li>You assume all responsibility for any actions or decisions made based on the information.</li>
              <li>Neither the app developer nor any affiliate assumes any liability—to the fullest extent permitted by law—for any consequences arising from your use of this tool.</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-2">5. If in Doubt, Don&apos;t Drive</h3>
            <p className="mb-2">If you have consumed any alcohol:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Do not drive—even if the estimate appears to show a BAC under the legal limit.</li>
              <li>Consider safe alternatives such as booking a ride-share, calling a taxi or Uber, using public transportation, or designating a sober driver.</li>
              <li>If you feel impaired or uncertain, err on the side of caution and avoid any activities that require alertness or coordination.</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-2">6. Emergency Situations</h3>
            <p>
              If you experience any symptoms of severe intoxication—such as confusion, difficulty walking, vomiting, loss of consciousness, slow or irregular breathing, or decreased responsiveness—seek medical attention immediately by calling 000 or going to the nearest hospital emergency department.
            </p>
          </div>
          
          <div className="pt-2 border-t border-white/10">
            <p className="text-center font-medium">
              Thank you for using this tool responsibly. Your safety—and the safety of others—is paramount.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex-shrink-0 flex gap-3 pt-4 border-t border-white/10">
          <DialogClose asChild>
            <Button variant="outline" className="flex-1">Cancel</Button>
          </DialogClose>
          <Button onClick={onContinue} className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15">
            Agree and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
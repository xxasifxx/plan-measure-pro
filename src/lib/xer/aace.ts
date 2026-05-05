// AACE International 98R-18 cost estimate classification.
// The CPM Scheduler/Estimator role progresses estimates from Class 5 (concept)
// down to Class 1 (bid check) as the design matures. This module visualizes
// that progression so a reviewer immediately understands the estimating cadence.
export interface AaceClass {
  cls: 5 | 4 | 3 | 2 | 1;
  name: string;
  designMaturity: string; // % project definition
  purpose: string;
  methodology: string;
  accuracyLow: number;    // signed % (e.g. -50)
  accuracyHigh: number;   // signed % (e.g. +100)
  effort: string;         // typical effort relative to a Class 1 reference
  njdotStage: string;     // mapping to NJDOT capital program stage
}

export const AACE_CLASSES: AaceClass[] = [
  {
    cls: 5,
    name: 'Class 5 · Concept Screening',
    designMaturity: '0% – 2%',
    purpose: 'Order-of-magnitude budgeting for concept screening and feasibility.',
    methodology: 'Capacity-factored, parametric models, judgment, analogy.',
    accuracyLow: -50, accuracyHigh: 100,
    effort: '1× (lowest)',
    njdotStage: 'Concept Development',
  },
  {
    cls: 4,
    name: 'Class 4 · Study / Feasibility',
    designMaturity: '1% – 15%',
    purpose: 'Schematic design budget — go/no-go decisions.',
    methodology: 'Equipment-factored, parametric, partial design quantities.',
    accuracyLow: -30, accuracyHigh: 50,
    effort: '2× – 4×',
    njdotStage: 'Preliminary Engineering',
  },
  {
    cls: 3,
    name: 'Class 3 · Budget Authorization',
    designMaturity: '10% – 40%',
    purpose: 'Funding authorization, capital program submission to NJDOT.',
    methodology: 'Semi-detailed unit costs, partial assembly-level takeoffs.',
    accuracyLow: -20, accuracyHigh: 30,
    effort: '3× – 10×',
    njdotStage: 'Final Design Submission',
  },
  {
    cls: 2,
    name: 'Class 2 · Control Estimate',
    designMaturity: '30% – 75%',
    purpose: 'Bid / tender preparation and control baseline.',
    methodology: 'Detailed unit costs with line-item takeoffs from PS&E set.',
    accuracyLow: -15, accuracyHigh: 20,
    effort: '5× – 20×',
    njdotStage: 'PS&E Package',
  },
  {
    cls: 1,
    name: 'Class 1 · Bid Check / Definitive',
    designMaturity: '65% – 100%',
    purpose: 'Bid check, change-order pricing, claim defense.',
    methodology: 'Detailed crew-based estimating · subcontract quotes · risk loaded.',
    accuracyLow: -10, accuracyHigh: 15,
    effort: '10× – 100×',
    njdotStage: 'Award & Construction',
  },
];

export const accuracyBand = (c: AaceClass) => `${c.accuracyLow}% / +${c.accuracyHigh}%`;

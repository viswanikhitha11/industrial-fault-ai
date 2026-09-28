/**
 * Fault Knowledge Base
 * --------------------
 * A reference list of KNOWN fault patterns per equipment type, each with the
 * visual indicators that typically signal it and the symptom keywords
 * usually reported alongside it.
 *
 * This is fed into the AI prompt so the model checks the photo/description
 * against documented patterns ("if X is visible, that's a known indicator
 * of Y") instead of reasoning purely from general/unstructured knowledge.
 * This is the kind of grounding a domain expert would give a new
 * technician: a checklist of "look for this, it usually means that."
 *
 * Extend this file as you learn more real fault patterns — it's the main
 * lever for making the AI's answers more specific to YOUR equipment.
 */

export const FAULT_KNOWLEDGE_BASE = {
  Motor: [
    {
      fault: "Bearing overheating / wear",
      visualIndicators: [
        "Discoloration (bluish/brownish tint) or heat marks near the bearing housing",
        "Grease or oil leakage/staining around the bearing seal",
        "Visible rust, pitting, or metal shavings near the shaft",
      ],
      symptomKeywords: ["vibration", "hot", "grinding noise", "screeching", "shaft play"],
    },
    {
      fault: "Winding damage / burnt insulation",
      visualIndicators: [
        "Burn marks, charring, or dark discoloration on the motor casing or terminal box",
        "Melted or bubbled insulation visible at wire entry points",
        "Soot or smoke residue around vents",
      ],
      symptomKeywords: ["burning smell", "tripping breaker", "smoke", "sparking"],
    },
    {
      fault: "Misalignment / mounting issue",
      visualIndicators: [
        "Visible gap or offset between motor shaft and coupling",
        "Worn or cracked mounting feet/bolts",
        "Uneven wear pattern on coupling or belt",
      ],
      symptomKeywords: ["vibration", "wobbling", "noise that changes with speed"],
    },
    {
      fault: "Cooling fan / ventilation blockage",
      visualIndicators: [
        "Dust, debris, or fibrous buildup on fan blades or intake vents",
        "Cracked or missing fan cover/blades",
      ],
      symptomKeywords: ["overheating", "hot casing", "reduced airflow"],
    },
  ],

  Pump: [
    {
      fault: "Seal / gasket leakage",
      visualIndicators: [
        "Visible fluid pooling or dripping at the seal/gasket interface",
        "Mineral crust or staining trail from a slow leak",
        "Corrosion around the leak point",
      ],
      symptomKeywords: ["leak", "dripping", "wet floor", "pressure drop"],
    },
    {
      fault: "Cavitation",
      visualIndicators: [
        "Pitting or erosion damage visible on impeller/casing (if accessible)",
        "No single visible external sign — often inferred from sound",
      ],
      symptomKeywords: ["rattling", "marbles sound", "gravel noise", "fluctuating pressure"],
    },
    {
      fault: "Bearing / shaft wear",
      visualIndicators: [
        "Heat discoloration near bearing housing",
        "Visible shaft wobble or misalignment at the coupling",
      ],
      symptomKeywords: ["vibration", "grinding", "hot housing"],
    },
    {
      fault: "Overheating",
      visualIndicators: [
        "Discoloration on motor/pump housing",
        "Steam or heat haze visible near the casing",
      ],
      symptomKeywords: ["hot to touch", "hot", "burning smell", "reduced flow"],
    },
  ],

  "Conveyor Belt": [
    {
      fault: "Belt misalignment / tracking issue",
      visualIndicators: [
        "Belt visibly running off-center from rollers/pulleys",
        "Uneven wear pattern along one edge of the belt",
        "Frayed or damaged belt edge",
      ],
      symptomKeywords: ["rubbing", "edge wear", "belt drifting"],
    },
    {
      fault: "Belt damage (tears, cuts, splicing failure)",
      visualIndicators: [
        "Visible tears, cuts, or holes in the belt surface",
        "Separated or failing splice/joint",
        "Exposed internal fabric/cords",
      ],
      symptomKeywords: ["flapping noise", "visible tear", "material falling through"],
    },
    {
      fault: "Roller / idler failure",
      visualIndicators: [
        "Roller not rotating freely, flat-spotted, or visibly seized",
        "Rust or heat discoloration on roller bearing",
      ],
      symptomKeywords: ["squeaking", "grinding", "belt slowing at one point"],
    },
    {
      fault: "Material buildup / spillage",
      visualIndicators: [
        "Visible accumulation of material on rollers, belt underside, or frame",
        "Debris causing belt to ride unevenly",
      ],
      symptomKeywords: ["spillage", "jamming", "uneven load"],
    },
  ],

  "Electrical Panel": [
    {
      fault: "Overheating / loose connection",
      visualIndicators: [
        "Discoloration, browning, or melting on wires, terminals, or breaker housing",
        "Visible corrosion or looseness at a connection point",
      ],
      symptomKeywords: ["hot panel", "tripping", "buzzing"],
    },
    {
      fault: "Arcing / burn damage",
      visualIndicators: [
        "Black soot or char marks around a breaker/terminal",
        "Pitting or melted metal at a contact point",
        "Visible scorch marks on the panel backplate",
      ],
      symptomKeywords: ["burning smell", "sparking", "popping sound", "smoke"],
    },
    {
      fault: "Corrosion / moisture ingress",
      visualIndicators: [
        "Green/white corrosion residue on terminals or bus bars",
        "Water staining or rust inside the enclosure",
      ],
      symptomKeywords: ["intermittent faults", "nuisance tripping", "damp environment"],
    },
    {
      fault: "Exposed live parts / damaged insulation",
      visualIndicators: [
        "Missing panel covers or knockouts",
        "Cracked, frayed, or stripped wire insulation",
      ],
      symptomKeywords: ["exposed wire", "shock risk", "damaged cover"],
    },
  ],
};

/**
 * Build a plain-text reference block for a given equipment type, to insert
 * into the AI prompt. Falls back to an empty string for unlisted types
 * (e.g. "Other") so the prompt degrades gracefully.
 */
export function getFaultReferenceText(equipmentType) {
  const entries = FAULT_KNOWLEDGE_BASE[equipmentType];
  if (!entries || entries.length === 0) return "";

  const lines = entries.map(
    (e, i) =>
      `${i + 1}. ${e.fault}\n   Known visual indicators: ${e.visualIndicators.join("; ")}\n   Commonly reported alongside: ${e.symptomKeywords.join(", ")}`
  );

  return `Reference: known fault patterns for "${equipmentType}" equipment (check the
image and description against these documented indicators before concluding
a fault — if none of these match well, say so honestly rather than forcing
a fit):\n${lines.join("\n")}`;
}

const interventionTemplates = {
  remove: {
    title: (unit) => `Remove or withhold ${unit}`,
    clause: (unit) => `remove or withhold ${unit}`,
  },
  add: {
    title: (unit) => `Add or acquire ${unit}`,
    clause: (unit) => `add or acquire ${unit}`,
  },
  reweight: {
    title: (unit) => `Reweight ${unit}`,
    clause: (unit) => `reweight ${unit}`,
  },
  repair: {
    title: (unit) => `Repair or replace ${unit}`,
    clause: (unit) => `repair or replace ${unit}`,
  },
  reserve: {
    title: (unit) => `Reserve ${unit} for evaluation`,
    clause: (unit) => `reserve ${unit} for evaluation`,
  },
  relicense: {
    title: (unit) => `Change access terms for ${unit}`,
    clause: (unit) => `change access terms for ${unit}`,
  },
};

const roleCompatibility = {
  reserve: {
    recommendedRole: "evaluation",
    note: "Reserving data for evaluation is usually an evaluation-role intervention. Keep this role only if the access regime itself is the object of study.",
  },
  relicense: {
    recommendedRole: "access",
    note: "Changing access terms is usually an access-and-governance intervention. Keep this role only if the terms directly change the selected pipeline stage.",
  },
};

export function formatIntervention(interventionId, unitLabel) {
  const template = interventionTemplates[interventionId];
  if (!template) throw new Error(`Unknown framing intervention '${interventionId}'.`);

  return {
    title: template.title(unitLabel),
    clause: template.clause(unitLabel),
  };
}

export function buildFrameQuestion({ interventionId, unitLabel, outcomeLabel, roleLabel }) {
  const phrase = formatIntervention(interventionId, unitLabel);
  return {
    title: phrase.title,
    question: `How does ${outcomeLabel} change when we ${phrase.clause}, treating this primarily as a change to ${roleLabel.toLowerCase()}?`,
  };
}

export function getRoleCompatibilityNote(roleId, interventionId) {
  const compatibility = roleCompatibility[interventionId];
  if (!compatibility || compatibility.recommendedRole === roleId) return "";
  return compatibility.note;
}

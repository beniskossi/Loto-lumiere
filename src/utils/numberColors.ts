export const getNumberColorClasses = (number: number): string => {
  if (number >= 1 && number <= 9) {
    return "bg-number-1-9 text-number-1-9-fg ring-1 ring-inset ring-number-1-9-fg/20";
  } else if (number >= 10 && number <= 19) {
    return "bg-number-10-19 text-number-10-19-fg ring-1 ring-inset ring-white/30";
  } else if (number >= 20 && number <= 29) {
    return "bg-number-20-29 text-number-20-29-fg ring-1 ring-inset ring-white/30";
  } else if (number >= 30 && number <= 39) {
    return "bg-number-30-39 text-number-30-39-fg ring-1 ring-inset ring-white/30";
  } else if (number >= 40 && number <= 49) {
    return "bg-number-40-49 text-number-40-49-fg ring-1 ring-inset ring-white/30";
  } else if (number >= 50 && number <= 59) {
    return "bg-number-50-59 text-number-50-59-fg ring-1 ring-inset ring-white/30";
  } else if (number >= 60 && number <= 69) {
    return "bg-number-60-69 text-number-60-69-fg ring-1 ring-inset ring-white/30";
  } else if (number >= 70 && number <= 79) {
    return "bg-number-70-79 text-number-70-79-fg ring-1 ring-inset ring-white/30";
  } else if (number >= 80 && number <= 90) {
    return "bg-number-80-90 text-number-80-90-fg ring-1 ring-inset ring-white/30";
  }
  return "bg-muted text-muted-foreground ring-1 ring-inset ring-border";
};

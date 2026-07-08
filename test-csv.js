function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length === 0) return [];
  
  const results = [];
  const dateIsoRegex = /\b(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})\b/;
  const dateFrRegex = /\b(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})\b/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // ignore headers by checking if it contains mostly numbers
    const parts = line.split(/[,;\t|]/).map(p => p.trim());
    
    // find all valid numbers in the row
    let potentialNumbers = [];
    let dateStr = "";
    let nameStr = "";
    
    parts.forEach(part => {
      // is it a date?
      if (!dateStr && (part.match(dateIsoRegex) || part.match(dateFrRegex))) {
        dateStr = part;
      } 
      // is it a name? (mostly letters)
      else if (!nameStr && isNaN(parseInt(part)) && part.length > 2 && /[a-zA-Z]/.test(part) && !part.toLowerCase().includes('date') && !part.toLowerCase().includes('tirage')) {
        nameStr = part;
      }
      // is it numbers? (could be space separated)
      else {
        const nums = part.match(/\b\d+\b/g);
        if (nums) {
          potentialNumbers.push(...nums.map(n => parseInt(n)).filter(n => n >= 1 && n <= 90));
        }
      }
    });
    
    // if we couldn't find date from columns, search in whole line
    if (!dateStr) {
       const mIso = line.match(dateIsoRegex);
       const mFr = line.match(dateFrRegex);
       if (mIso) dateStr = mIso[0];
       else if (mFr) dateStr = mFr[0];
    }
    
    if (potentialNumbers.length >= 5) {
      results.push({
        draw_name: nameStr,
        draw_date: dateStr,
        winning_numbers: potentialNumbers.slice(0, 5),
        machine_numbers: potentialNumbers.length >= 10 ? potentialNumbers.slice(5, 10) : undefined
      });
    }
  }
  return results;
}

console.log(parseCSV("Tirage,Date,N1,N2,N3,N4,N5\nLundi,01/01/2023,10,20,30,40,50"));
console.log(parseCSV("02/01/2023;Mardi;1,2,3,4,5;6,7,8,9,10"));

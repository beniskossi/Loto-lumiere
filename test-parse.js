const parseJSONContent = (text) => {
  try {
    const parsed = JSON.parse(text);
    
    // recursively find arrays that look like records
    const extractRecords = (obj) => {
      let records = [];
      if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] === 'object') {
          records = records.concat(obj);
        }
        for (const item of obj) {
          records = records.concat(extractRecords(item));
        }
      } else if (typeof obj === 'object' && obj !== null) {
        // if this object looks like a record itself
        const keys = Object.keys(obj).join(' ').toLowerCase();
        if ((keys.includes('date') || keys.includes('time')) && 
            (keys.includes('win') || keys.includes('number') || keys.includes('num') || keys.includes('gagnant'))) {
          records.push(obj);
        } else {
          for (const key in obj) {
            records = records.concat(extractRecords(obj[key]));
          }
        }
      }
      return records;
    };
    
    let items = Array.isArray(parsed) ? parsed : extractRecords(parsed);
    if (items.length === 0 && !Array.isArray(parsed) && typeof parsed === 'object') {
      items = [parsed];
    }
    
    console.log("Extracted items:", items);
  } catch (e) {
    console.error(e);
  }
};
parseJSONContent('{"data": [{"date": "2023-01-01", "winning": [1,2,3,4,5]}]}');

export default function equalityPercentage(str1: string, str2: string): number {
  const matchDestructively = (toMatch1 = "", toMatch2 = "") => {
    toMatch1 = toMatch1.toLowerCase();
    toMatch2 = toMatch2.toLowerCase();
    const arr = [];
    for (let i = 0; i <= toMatch1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= toMatch2.length; j++) {
        if (i === 0) {
          arr[j] = j;
        } else if (j > 0) {
          let newValue = arr[j - 1];
          if (toMatch1.charAt(i - 1) !== toMatch2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), arr[j]) + 1;
          }
          arr[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        arr[toMatch2.length] = lastValue;
      }
    }
    return arr[toMatch2.length];
  };

  const calculateSimilarity = (toCalc1 = "", toCalc2 = "") => {
    // Get the length of the strings
    let longer = toCalc1;
    let shorter = toCalc2;
    if (toCalc1.length < toCalc2.length) {
      longer = toCalc2;
      shorter = toCalc1;
    }
    const longerLength = longer.length;
    if (longerLength === 0) {
      return 1;
    }
    // Calculate the edit distance
    return +(((longerLength - matchDestructively(longer, shorter)) / longerLength) * 100).toFixed(
      2
    );
  };

  return calculateSimilarity(str1, str2);
}

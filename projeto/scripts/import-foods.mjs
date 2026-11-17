// Offline reproducible extraction of the official USDA SR Legacy CSV release, CC0/public domain.
// Usage: node scripts/import-foods.mjs <extracted-dataset-directory>
import fs from 'node:fs';
import path from 'node:path';
function csv(text) {
  const rows = [];
  let row = [],
    value = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if (c === '\n' && !quoted) {
      row.push(value.replace(/\r$/, ''));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else value += c;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const header = rows.shift();
  return rows.map((r) => Object.fromEntries(header.map((key, i) => [key, r[i] ?? ''])));
}
const dir = process.argv[2];
if (!dir)
  throw new Error(
    'Provide the directory containing food.csv, food_nutrient.csv and food_portion.csv.',
  );
const read = (file) => csv(fs.readFileSync(path.join(dir, file), 'utf8'));
const selection = JSON.parse(fs.readFileSync('scripts/food-selection.json', 'utf8'));
const ids = new Set(selection.map((row) => row[0]));
const foods = read('food.csv').filter((f) => ids.has(f.fdc_id));
const nutrients = read('food_nutrient.csv').filter((f) => ids.has(f.fdc_id));
const portions = read('food_portion.csv').filter((f) => ids.has(f.fdc_id));
const result = selection.map(([id, name, category]) => {
  const original = foods.find((f) => f.fdc_id === id);
  if (!original) throw new Error(`Missing ${id}`);
  const nutrient = (n) => {
    const row = nutrients.find((r) => r.fdc_id === id && r.nutrient_id === n);
    return row && row.amount !== '' ? Number(row.amount) : null;
  };
  return {
    id: `usda-${id}`,
    name,
    category,
    brand: '',
    source: `USDA FoodData Central SR Legacy 04/2018 · CC0 · ${original.description}`,
    sourceId: `https://fdc.nal.usda.gov/food-details/${id}/nutrients`,
    per100g: {
      kcal: nutrient('1008'),
      protein: nutrient('1003'),
      carbs: nutrient('1005'),
      fat: nutrient('1004'),
    },
    portions: portions
      .filter((p) => p.fdc_id === id && Number(p.gram_weight) > 0)
      .slice(0, 4)
      .map((p) => ({
        label: `Porção USDA: ${p.amount} ${p.modifier || p.portion_description || 'porção'}`,
        grams: Number(p.gram_weight),
      })),
  };
});
fs.writeFileSync('src/domain/food-data.json', JSON.stringify(result, null, 2));
console.log(`Imported ${result.length} foods with source IDs and food-specific portion weights.`);

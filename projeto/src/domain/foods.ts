import data from './food-data.json';
import { foodSchema } from './experience';
export const FOODS = foodSchema.array().parse(data);

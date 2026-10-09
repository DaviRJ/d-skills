import { discoverCategories } from "../lib/categories.js";

export interface ListOptions {
  json?: boolean;
  categories?: boolean;
  skillsRoot: string;
}

export function runList(options: ListOptions): void {
  const categories = discoverCategories(options.skillsRoot);
  if (options.json) {
    console.log(JSON.stringify(categories, null, 2));
    return;
  }
  if (categories.length === 0) {
    console.log("No skills found.");
    return;
  }
  for (const category of categories) {
    console.log(`${category.name} (${category.skills.length})`);
    if (!options.categories) {
      for (const skill of category.skills) {
        console.log(`  - ${skill.name}`);
      }
    }
  }
}

// Orchestrator: runs the full WBS rebuild pipeline.
import { execSync } from 'node:child_process';

const steps = [
  'scripts/wbs/build-spine.mjs',
  'scripts/wbs/build-activities.mjs',
  'scripts/wbs/build-relationships.mjs',
  'scripts/wbs/build-state.mjs',
  'scripts/wbs/build-next.mjs',
];

for (const step of steps) {
  console.log(`\n=== ${step} ===`);
  execSync(`node ${step}`, { stdio: 'inherit' });
}
console.log('\n[all] pipeline complete. Outputs in .lovable/wbs/');

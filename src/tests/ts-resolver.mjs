import fs from 'node:fs';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      try {
        const parentUrl = new URL(context.parentURL);
        const candidateUrl = new URL(specifier + '.ts', parentUrl);
        if (fs.existsSync(candidateUrl)) {
          return nextResolve(specifier + '.ts', context);
        }
      } catch {}
    }
    throw err;
  }
}

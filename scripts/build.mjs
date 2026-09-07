// Allow pending native Vite/Rolldown handles to close naturally on Windows.
// An immediate process.exit(0) in the upstream CLI can abort while handles close.
// Nonzero exits are preserved and build failures remain failures.
if (process.platform === 'win32') {
  const exit = process.exit.bind(process);
  process.exit = (code) => {
    if (code === 0) { process.exitCode = 0; return; }
    return exit(code);
  };
}
process.argv.splice(2, 0, 'build');
await import('../node_modules/vinext/dist/cli.js');

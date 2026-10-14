/**
 * Run checks in declaration order, contain individual check failures, and report the final exit code.
 * Each thrown check becomes one reported problem and does not prevent later checks from running.
 * @param checks - Ordered checks whose runners return problem strings or throw.
 * @param write - Synchronous sink for each output line, including the blank separator.
 * @returns Zero when every check passes, otherwise one.
 */
export function runChecks(checks, write) {
  let failed = 0
  for (const { name, run } of checks) {
    let problems
    try {
      problems = run()
    } catch (error) {
      problems = [`check threw: ${error instanceof Error ? error.message : String(error)}`]
    }
    if (problems.length === 0) {
      write(`  ok   ${name}`)
    } else {
      failed += 1
      write(`  FAIL ${name}`)
      for (const problem of problems) write(`         ${problem}`)
    }
  }

  write('')
  write(failed === 0 ? `verify: ${checks.length} checks passed` : `verify: ${failed} of ${checks.length} checks failed`)
  return failed === 0 ? 0 : 1
}

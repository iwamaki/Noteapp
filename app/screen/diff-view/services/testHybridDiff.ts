// Test file for hybrid diff implementation
import { generateDiff, validateDataConsistency } from './diffService';

// Test data from the issue
const testCases = [
  {
    name: 'Line deletion',
    original: 'これは削除される行',
    new: '',
    expectedBehavior: 'Should show 1 line as deleted'
  },
  {
    name: 'Line addition',
    original: '',
    new: 'これは追加される行',
    expectedBehavior: 'Should show 1 line as added'
  },
  {
    name: 'No change',
    original: 'これは変更されない行',
    new: 'これは変更されない行',
    expectedBehavior: 'Should show no diff'
  },
  {
    name: 'Character addition within line',
    original: 'これは追加される""',
    new: 'これは追加される"文字"',
    expectedBehavior: 'Should show inline change with "文字" highlighted as added'
  },
  {
    name: 'Character deletion within line',
    original: 'これは削除される"文字"',
    new: 'これは削除される""',
    expectedBehavior: 'Should show inline change with "文字" highlighted as deleted'
  },
  {
    name: 'Character replacement',
    original: 'これは変更される"文字"',
    new: 'これは変更される"学業"',
    expectedBehavior: 'Should show inline changes with "文字" deleted and "学業" added'
  },
  {
    name: 'Multi-line with mixed changes',
    original: `行1
削除される行
共通の行
変更前の文字`,
    new: `行1
追加される行
共通の行
変更後の文字`,
    expectedBehavior: 'Should maintain line integrity with inline changes for modified lines'
  }
];

export function testHybridDiff() {
  console.log('Testing Hybrid Diff Implementation\n');
  console.log('=====================================\n');

  const results: { name: string; passed: boolean; details: string }[] = [];

  testCases.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name}`);
    console.log(`Original: "${test.original}"`);
    console.log(`New: "${test.new}"`);
    console.log(`Expected: ${test.expectedBehavior}\n`);

    const diff = generateDiff(test.original, test.new);

    // Display results
    if (diff.length === 0) {
      console.log('Result: No differences detected\n');
    } else {
      console.log('Result:');
      diff.forEach((line) => {
        const lineNumInfo = `[${line.originalLineNumber || ' '}:${line.newLineNumber || ' '}]`;
        const typeSymbol = line.type === 'added' ? '+' : line.type === 'deleted' ? '-' : ' ';

        console.log(`${lineNumInfo} ${typeSymbol} "${line.content}"`);

        // Show inline changes if present
        if (line.inlineChanges && line.inlineChanges.length > 0) {
          console.log('  Inline changes:');
          line.inlineChanges.forEach(change => {
            console.log(`    [${change.type}] "${change.content}" (${change.startIndex}-${change.endIndex})`);
          });
        }
      });
    }

    // Validate data consistency
    const validation = validateDataConsistency(test.original, test.new, diff);
    console.log(`Validation: ${validation.isValid ? 'PASS' : 'FAIL'}`);
    if (!validation.isValid) {
      console.log(`  Error: ${validation.error}`);
    }

    results.push({
      name: test.name,
      passed: validation.isValid,
      details: validation.error || 'Success'
    });

    console.log('-------------------------------------\n');
  });

  // Special test: Line fragmentation issue from original implementation
  console.log('Special Test: Checking line fragmentation is resolved');
  const fragmentTest = {
    original: 'これは削除される"文字"です',
    new: 'これは削除される""です'
  };

  const fragmentDiff = generateDiff(fragmentTest.original, fragmentTest.new);
  console.log(`Original: "${fragmentTest.original}"`);
  console.log(`New: "${fragmentTest.new}"`);
  console.log(`Number of diff lines: ${fragmentDiff.length}`);
  console.log(`Expected: 2 lines (1 deleted, 1 added) with inline changes`);
  console.log(`Actual result:`);

  fragmentDiff.forEach((line, index) => {
    console.log(`  Line ${index + 1}: type=${line.type}, content="${line.content}"`);
    if (line.inlineChanges) {
      console.log(`    Has ${line.inlineChanges.length} inline changes`);
    }
  });

  const isFragmented = fragmentDiff.length > 2;
  console.log(`\nLine fragmentation: ${isFragmented ? 'DETECTED (FAIL)' : 'NOT DETECTED (PASS)'}`);

  // Summary
  console.log('\n=====================================');
  console.log('Test Summary:');
  console.log('=====================================');

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`Total: ${totalTests} tests`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Line fragmentation resolved: ${!isFragmented ? 'YES' : 'NO'}`);

  return {
    results,
    fragmentationResolved: !isFragmented,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests
    }
  };
}

// Run test if executed directly
if (require.main === module) {
  testHybridDiff();
}
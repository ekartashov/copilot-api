#!/bin/bash

echo "Running API Key Rotation Tests"
echo "=============================="

echo ""
echo "1. Running Token Parser Tests..."
bun test test/lib/token-parser.test.ts
PARSER_EXIT=$?

echo ""
echo "2. Running Account Manager Tests..."
bun test test/lib/account-manager.test.ts  
MANAGER_EXIT=$?

echo ""
echo "3. Running Rotation Logging Tests..."
bun test test/lib/rotation-logging.test.ts
LOGGING_EXIT=$?

echo ""
echo "4. Running Integration Tests (individually to avoid mock conflicts)..."
echo "   4.1. Parse tokens, initialize manager, and handle rotation..."
bun test test/integration/api-key-rotation.test.ts -t "should parse tokens, initialize manager, and handle rotation"
TEST1_EXIT=$?

echo "   4.2. Handle rapid successive rate limits..."
bun test test/integration/api-key-rotation.test.ts -t "should handle rapid successive rate limits"
TEST2_EXIT=$?

echo "   4.3. Gracefully fall back to single token mode..."
bun test test/integration/api-key-rotation.test.ts -t "should gracefully fall back to single token mode"
TEST3_EXIT=$?

echo "   4.4. Handle malformed token environment variables..."
bun test test/integration/api-key-rotation.test.ts -t "should handle malformed token environment variables"
TEST4_EXIT=$?

echo ""
echo "=============================="
echo "TEST RESULTS SUMMARY:"
echo "=============================="

if [ $PARSER_EXIT -eq 0 ]; then
    echo "✅ Token Parser Tests: PASSED"
else
    echo "❌ Token Parser Tests: FAILED"
fi

if [ $MANAGER_EXIT -eq 0 ]; then
    echo "✅ Account Manager Tests: PASSED"
else
    echo "❌ Account Manager Tests: FAILED"
fi

if [ $LOGGING_EXIT -eq 0 ]; then
    echo "✅ Rotation Logging Tests: PASSED"
else
    echo "❌ Rotation Logging Tests: FAILED"
fi

if [ $TEST1_EXIT -eq 0 ]; then
    echo "✅ Integration Test 1: PASSED"
else
    echo "❌ Integration Test 1: FAILED"
fi

if [ $TEST2_EXIT -eq 0 ]; then
    echo "✅ Integration Test 2: PASSED"
else
    echo "❌ Integration Test 2: FAILED"
fi

if [ $TEST3_EXIT -eq 0 ]; then
    echo "✅ Integration Test 3: PASSED"
else
    echo "❌ Integration Test 3: FAILED"
fi

if [ $TEST4_EXIT -eq 0 ]; then
    echo "✅ Integration Test 4: PASSED"
else
    echo "❌ Integration Test 4: FAILED"
fi

echo ""
TOTAL_FAILURES=$((PARSER_EXIT + MANAGER_EXIT + LOGGING_EXIT + TEST1_EXIT + TEST2_EXIT + TEST3_EXIT + TEST4_EXIT))

if [ $TOTAL_FAILURES -eq 0 ]; then
    echo "🎉 ALL CORE API KEY ROTATION TESTS PASSED!"
    exit 0
else
    echo "⚠️ Some tests failed. Check individual results above."
    exit 1
fi
#!/usr/bin/env bun

// Simple test runner script for development
import { $ } from "bun"

console.log("🧪 Running Copilot API Tests...")

try {
  // Run tests with coverage
  console.log("\n📊 Running tests with coverage...")
  await $`bun test --coverage`
  
  console.log("\n✅ All tests passed!")
  
  // Optional: Open coverage report
  if (process.argv.includes("--open-coverage")) {
    console.log("\n📖 Opening coverage report...")
    await $`open coverage/index.html`
  }
  
} catch (error) {
  console.error("\n❌ Tests failed!")
  console.error(error)
  process.exit(1)
}
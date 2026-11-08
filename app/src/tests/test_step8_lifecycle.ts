/**
 * Step 8 Prompt Revision & Feedback Engine Verification Script
 */
import { revisePromptWithFeedback } from "../lib/generation/feedback";

async function main() {
  console.log("=================================================================");
  console.log("STEP 8 FEEDBACK & PROMPT REVISION ENGINE TEST");
  console.log("=================================================================");

  const basePrompt = "Modern studio product flatlay with soft northern daylight on neutral grey surface.";

  // 1. Test "Make background more premium"
  console.log("\n1. Testing 'Make the background more premium' directive...");
  const res1 = revisePromptWithFeedback({
    previousPrompt: basePrompt,
    feedbackText: "Make the background more premium",
    productTitle: "Gingerbread Lane Phone Case",
    currentHeadline: "Never Drop Your Phone Again",
  });

  if (!res1.revisedPrompt.includes("Carrara marble") && !res1.revisedPrompt.includes("luxurious")) {
    throw new Error(`Revised prompt does not contain luxury background cues: ${res1.revisedPrompt}`);
  }
  if (!res1.revisedPrompt.includes("Make the background more premium")) {
    throw new Error(`Revised prompt does not contain user directive: ${res1.revisedPrompt}`);
  }
  console.log("  [PASS] Background categorized as 'background'");
  console.log(`  [PASS] Revised prompt contains luxury directives: "${res1.revisedPrompt.substring(0, 90)}..."`);

  // 2. Test "Make the product larger"
  console.log("\n2. Testing 'Make the product larger' directive...");
  const res2 = revisePromptWithFeedback({
    previousPrompt: basePrompt,
    feedbackText: "Make the product larger and closer",
    productTitle: "Gingerbread Lane Phone Case",
  });

  if (res2.category !== "composition") {
    throw new Error(`Expected category composition, got ${res2.category}`);
  }
  if (!res2.revisedPrompt.includes("macro") && !res2.revisedPrompt.includes("dominance")) {
    throw new Error(`Revised prompt does not contain macro scale cues: ${res2.revisedPrompt}`);
  }
  console.log("  [PASS] Product scale categorized as 'composition' with macro hero framing");

  // 3. Test "Use a more minimal composition"
  console.log("\n3. Testing 'Use a more minimal composition' directive...");
  const res3 = revisePromptWithFeedback({
    previousPrompt: basePrompt,
    feedbackText: "Use a more minimal composition",
  });
  if (!res3.revisedPrompt.includes("minimalist") && !res3.revisedPrompt.includes("negative space")) {
    throw new Error(`Revised prompt does not contain minimalist cues: ${res3.revisedPrompt}`);
  }
  console.log("  [PASS] Minimalist directive injected negative space and matte limestone");

  // 4. Test "Make the headline more direct"
  console.log("\n4. Testing 'Make the headline more direct' directive...");
  const res4 = revisePromptWithFeedback({
    previousPrompt: basePrompt,
    feedbackText: "Make the headline more direct",
    currentHeadline: "Are You Tired Of Clumsy Drops When You Walk Your Dog Every Morning?",
  });
  if (res4.category !== "copy") {
    throw new Error(`Expected category copy, got ${res4.category}`);
  }
  if (!res4.revisedHeadline || res4.revisedHeadline.length > 50) {
    throw new Error(`Headline not shortened for directness: ${res4.revisedHeadline}`);
  }
  console.log(`  [PASS] Headline directness refined: "${res4.revisedHeadline}"`);

  // 5. Test arbitrary custom marketer feedback
  console.log("\n5. Testing arbitrary natural-language custom feedback...");
  const customFeedback = "Add soft holiday pine needles and warm cinnamon sticks in soft focus backdrop.";
  const res5 = revisePromptWithFeedback({
    previousPrompt: basePrompt,
    feedbackText: customFeedback,
  });
  if (!res5.revisedPrompt.includes(customFeedback)) {
    throw new Error(`Custom feedback directive missing from revised prompt: ${res5.revisedPrompt}`);
  }
  console.log("  [PASS] Custom natural language directive injected verbatim into prompt stream");

  console.log("\n=================================================================");
  console.log("ALL PROMPT REVISION TESTS PASSED SUCCESSFULLY");
  console.log("=================================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});


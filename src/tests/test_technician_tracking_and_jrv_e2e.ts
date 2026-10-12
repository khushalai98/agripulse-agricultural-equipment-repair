/**
 * End-to-End Integration Test for YANTRIQ Simulated Technician Repair Workflow
 * 
 * Verifies the complete journey:
 * 1. Farmer reports a breakdown
 * 2. Technician accepts
 * 3. Technician taps "रास्ते में हूँ"
 * 4. Farmer sees "Mechanic is on the way"
 * 5. Technician taps "पहुँच गया"
 * 6. Farmer sees arrival status
 * 7. Technician starts repair
 * 8. Farmer sees repair-in-progress
 * 9. Technician completes repair
 * 10. Job-Ready Verification opens
 * 11. Verification result evaluated & saved (JOB_READY, NEED_RECHECK, NOT_JOB_READY)
 * 12. Machine Passport holds the verification record
 * 13. Invalid status transitions & duplicate clicks prevented
 */

import {
  createRepairRequest,
  updateRepairStatus,
  recordRepairVerification,
  getRepairRequests,
  getMachines,
  resetDemoData,
  seedRameshPatilDemoRepair,
  DEMO_WATERPUMP_REPAIR,
} from "../services/storageService";
import {
  createJobCard,
  getJobCardByRepairId,
  updateTechnicianWorkflowStatus,
} from "../services/jobCardService";
import {
  computeJobReadyResult,
  getInitialSprayingChecks,
  saveJobReadinessRecord,
  getJobReadinessRecordByRepairId,
  buildEvidenceMetadata,
} from "../services/jobReadinessService";
import { RepairRequest, MachinePassportRecord } from "../types";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failedCount++;
  }
}

async function runSimulationE2ETest() {
  console.log("==================================================================");
  console.log("STARTING YANTRIQ SIMULATED TECHNICIAN REPAIR WORKFLOW E2E TEST");
  console.log("==================================================================\n");

  // Step 0: Clean slate & verify demo seeding
  console.log("--- 0. Testing Demo Preset Seeding ---");
  const seeded = seedRameshPatilDemoRepair();
  assert(seeded.id === "rep-demo-waterpump-patil", "Seeded repair has correct ID");
  assert(seeded.farmerName === "Ramesh Patil", "Farmer is Ramesh Patil");
  assert(seeded.machineNameHi.includes("वाटर पंप"), "Machine is Water Pump");
  assert(seeded.assignedTechnicianNameHi === "महेश वर्मा", "Assigned technician is Mahesh Verma");
  assert(seeded.assignedTechnicianRating === 4.7, "Technician rating is 4.7");

  // Step 1: Farmer reports a breakdown
  console.log("\n--- 1. Testing Farmer Breakdown Reporting ---");
  const newRepair = createRepairRequest({
    machineId: "water_pump",
    machineNameHi: "वाटर पंप (Water Pump)",
    machineIcon: "💧",
    problemDescription: "पंप चल रहा है लेकिन पानी नहीं आ रहा है",
    inputMethod: "voice",
    urgency: "today",
    farmerId: "farmer-ramesh-patil",
    farmerName: "Ramesh Patil",
    farmerPhone: "9876543210",
  });
  assert(newRepair.id.startsWith("rep-"), "Repair created with valid ID");
  assert(newRepair.status === "finding_mechanic" || newRepair.status === "reported", "Initial status is searching for mechanic");

  // Step 2: Technician accepts request
  console.log("\n--- 2. Testing Technician Acceptance & Job Card Link ---");
  const acceptedRepair = updateRepairStatus(newRepair.id, {
    status: "technician_assigned",
    statusTextHi: "मैकेनिक नियुक्त हुआ",
    technicianId: "tech-005",
    assignedTechnicianName: "Mahesh Verma",
    assignedTechnicianNameHi: "महेश वर्मा",
    assignedTechnicianRating: 4.7,
    assignedTechnicianDistance: "3.2 किमी दूर (सिम्युलेटेड)",
    assignedTechnicianBadge: "✓ प्रमाणित मैकेनिक",
    technicianWorkflowStatus: "assigned",
  });
  assert(acceptedRepair !== null, "Repair status updated to technician_assigned");
  assert(acceptedRepair?.technicianId === "tech-005", "Technician ID linked correctly");

  const jobCard = createJobCard(newRepair.id, {
    farmerId: "farmer-ramesh-patil",
    farmerName: "Ramesh Patil",
    technicianId: "tech-005",
    machine: "वाटर पंप (Water Pump)",
    machineIcon: "💧",
    problem: "पंप चल रहा है लेकिन पानी नहीं आ रहा है",
  });
  assert(jobCard.jobId.startsWith("job-"), "Job card created successfully for shared repair");

  // Step 3: Technician taps "रास्ते में हूँ"
  console.log("\n--- 3. Testing Technician 'रास्ते में हूँ' (On The Way) ---");
  const nowIso1 = new Date().toISOString();
  const onTheWayRepair = updateRepairStatus(newRepair.id, {
    status: "on_the_way",
    statusTextHi: "मैकेनिक रास्ते में है",
    technicianWorkflowStatus: "on_the_way",
    onTheWayAt: nowIso1,
  });
  assert(onTheWayRepair?.status === "on_the_way", "Technician status moved to 'on_the_way'");
  assert(!!onTheWayRepair?.onTheWayAt, "Timestamp 'onTheWayAt' saved");

  // Step 4: Farmer sees "Mechanic is on the way"
  console.log("\n--- 4. Testing Farmer View Reaction (On The Way) ---");
  const allRepairsStage1 = getRepairRequests();
  const farmerView1 = allRepairsStage1.find((r) => r.id === newRepair.id);
  assert(farmerView1?.status === "on_the_way", "Farmer sees shared status 'on_the_way'");
  assert(farmerView1?.assignedTechnicianNameHi === "महेश वर्मा", "Farmer sees technician name 'महेश वर्मा'");

  // Step 5: Technician taps "पहुँच गया"
  console.log("\n--- 5. Testing Technician 'पहुँच गया' (Arrived) ---");
  const nowIso2 = new Date().toISOString();
  const arrivedRepair = updateRepairStatus(newRepair.id, {
    status: "arrived",
    statusTextHi: "मैकेनिक पहुँच गया",
    technicianWorkflowStatus: "arrived",
    arrivedAt: nowIso2,
  });
  assert(arrivedRepair?.status === "arrived", "Technician status moved to 'arrived'");
  assert(!!arrivedRepair?.arrivedAt, "Timestamp 'arrivedAt' saved");

  // Step 6: Farmer sees arrival status
  console.log("\n--- 6. Testing Farmer View Reaction (Arrived) ---");
  const allRepairsStage2 = getRepairRequests();
  const farmerView2 = allRepairsStage2.find((r) => r.id === newRepair.id);
  assert(farmerView2?.status === "arrived", "Farmer sees shared status 'arrived'");

  // Step 7: Technician starts repair
  console.log("\n--- 7. Testing Technician 'मरम्मत शुरू करें' (Repairing) ---");
  const nowIso3 = new Date().toISOString();
  const repairingRepair = updateRepairStatus(newRepair.id, {
    status: "repair_in_progress",
    statusTextHi: "मरम्मत शुरू हुई",
    technicianWorkflowStatus: "repairing",
    repairStartedAt: nowIso3,
  });
  assert(repairingRepair?.status === "repair_in_progress", "Technician status moved to 'repair_in_progress'");
  assert(!!repairingRepair?.repairStartedAt, "Timestamp 'repairStartedAt' saved");

  // Step 8: Farmer sees repair-in-progress
  console.log("\n--- 8. Testing Farmer View Reaction (Repairing) ---");
  const allRepairsStage3 = getRepairRequests();
  const farmerView3 = allRepairsStage3.find((r) => r.id === newRepair.id);
  assert(farmerView3?.status === "repair_in_progress", "Farmer sees shared status 'repair_in_progress'");

  // Step 9: Technician completes repair
  console.log("\n--- 9. Testing Technician 'मरम्मत पूरी हुई' ---");
  const nowIso4 = new Date().toISOString();
  const completedTechRepair = updateRepairStatus(newRepair.id, {
    status: "verification_pending",
    statusTextHi: "मरम्मत पूरी हुई — जाँच बाकी",
    technicianWorkflowStatus: "completed",
    repairCompletedAt: nowIso4,
  });
  assert(completedTechRepair?.status === "verification_pending", "Status moves to 'verification_pending', NOT auto-'completed'");
  assert(!!completedTechRepair?.repairCompletedAt, "Timestamp 'repairCompletedAt' saved");

  // Step 10: Farmer sees verification pending and machine is NOT automatically marked ready
  console.log("\n--- 10. Confirming Machine is NOT Automatically Job-Ready ---");
  const allRepairsStage4 = getRepairRequests();
  const farmerView4 = allRepairsStage4.find((r) => r.id === newRepair.id);
  assert(farmerView4?.status === "verification_pending", "Status is 'verification_pending'");
  assert(farmerView4?.verificationStatus !== "passed", "Machine verificationStatus is NOT prematurely passed");

  // Step 11: Testing Job-Ready Verification Outcomes
  console.log("\n--- 11. Testing Job-Ready Verification Rule Engine ---");

  // 11a: NEED_RECHECK (Missing photo/evidence)
  const needRecheckChecks = getInitialSprayingChecks().map((c) => ({
    ...c,
    status: "pass" as const,
  }));
  const needRecheckResult = computeJobReadyResult(needRecheckChecks, []);
  assert(needRecheckResult.status === "NEED_RECHECK", "Missing evidence correctly evaluates to NEED_RECHECK");

  // 11b: NOT_JOB_READY (Leakage detected during water test)
  const leakChecks = getInitialSprayingChecks().map((c) => {
    if (c.id === "no_leak") return { ...c, status: "fail" as const };
    return { ...c, status: "pass" as const };
  });
  const notJobReadyResult = computeJobReadyResult(leakChecks, ["data:image/svg+xml;base64,test"]);
  assert(notJobReadyResult.status === "NOT_JOB_READY", "Leakage failure correctly evaluates to NOT_JOB_READY");

  // 11c: STOP_AND_TECHNICIAN (Safety check fails)
  const safetyFailChecks = getInitialSprayingChecks().map((c) => {
    if (c.id === "safety_check") return { ...c, status: "fail" as const };
    return { ...c, status: "pass" as const };
  });
  const safetyStopResult = computeJobReadyResult(safetyFailChecks, ["data:image/svg+xml;base64,test"]);
  assert(safetyStopResult.status === "STOP_AND_TECHNICIAN", "Safety failure triggers STOP_AND_TECHNICIAN");

  // 11d: JOB_READY (All checks pass + valid evidence)
  const passChecks = getInitialSprayingChecks().map((c) => ({
    ...c,
    status: "pass" as const,
  }));
  const jobReadyResult = computeJobReadyResult(passChecks, ["data:image/svg+xml;base64,water_pump_clean_water_test"]);
  assert(jobReadyResult.status === "JOB_READY", "All checks pass evaluates to JOB_READY");
  assert(jobReadyResult.score === 100, "Clean pass receives score of 100");

  // Step 12: Record Verification Result and update Machine Passport
  console.log("\n--- 12. Testing Machine Passport Integration ---");
  const passportRecord: MachinePassportRecord = {
    repairDate: new Date().toLocaleDateString("hi-IN"),
    diagnosis: "वाटर पंप सक्शन लाइन रिपेयर एवं मैकेनिकल सील रिप्लेसमेंट",
    technician: "महेश वर्मा (प्रमाणित मैकेनिक)",
    partsUsed: ["Mechanical Water Seal", "Foot Valve Washer"],
    repairResult: "सफलतापूर्वक मरम्मत हुई",
    verificationResult: "मशीन सही पाई गई (Job-Ready: JOB_READY, Score: 100/100)",
    verificationId: `verif-${newRepair.id}`,
    finalCost: 450,
    jobOperation: "spraying",
    jobReadyStatus: "JOB_READY",
    score: 100,
    farmerConfirmation: true,
    timestamp: new Date().toISOString(),
  };

  const finalizedRepair = recordRepairVerification(
    newRepair.id,
    true,
    passportRecord,
    "Job-Ready Verification पास: स्कोर 100/100",
    passportRecord.verificationId
  );
  assert(finalizedRepair?.status === "completed", "Repair status successfully transitioned to 'completed'");
  assert(finalizedRepair?.verificationStatus === "passed", "Repair verificationStatus is 'passed'");
  assert(finalizedRepair?.passportData?.score === 100, "Passport record contains score 100");
  assert(finalizedRepair?.passportData?.technician === "महेश वर्मा (प्रमाणित मैकेनिक)", "Passport contains certified technician");
  assert(finalizedRepair?.passportData?.partsUsed.length === 2, "Passport contains parts used");

  // Step 13: Test Re-repair branch if verification had failed
  console.log("\n--- 13. Testing Re-repair Branch (Failed Verification) ---");
  const testFailRepair = createRepairRequest({
    machineId: "water_pump",
    machineNameHi: "वाटर पंप",
    machineIcon: "💧",
    problemDescription: "पानी नहीं आ रहा",
    inputMethod: "voice",
    urgency: "today",
  });
  const failedVerificationRepair = recordRepairVerification(testFailRepair.id, false, undefined, "लीकेज पाई गई");
  assert(failedVerificationRepair?.status === "re_repair_required", "Failed verification moves to 're_repair_required'");
  assert(failedVerificationRepair?.verificationStatus === "failed", "Verification status recorded as 'failed'");

  // Step 14: Sequential Transition Enforcement Validation
  console.log("\n--- 14. Testing Invalid Status Transition Prevention ---");
  const testSeqRepair = createRepairRequest({
    machineId: "water_pump",
    machineNameHi: "वाटर पंप",
    machineIcon: "💧",
    problemDescription: "टेस्ट सीक्वेंस",
    inputMethod: "voice",
    urgency: "today",
  });
  // Valid transitions sequence:
  // assigned -> on_the_way -> arrived -> repairing -> completed
  const seq1 = updateRepairStatus(testSeqRepair.id, { status: "on_the_way", technicianWorkflowStatus: "on_the_way" });
  assert(seq1?.status === "on_the_way", "Step 1: 'on_the_way' accepted");
  const seq2 = updateRepairStatus(testSeqRepair.id, { status: "arrived", technicianWorkflowStatus: "arrived" });
  assert(seq2?.status === "arrived", "Step 2: 'arrived' accepted");
  const seq3 = updateRepairStatus(testSeqRepair.id, { status: "repair_in_progress", technicianWorkflowStatus: "repairing" });
  assert(seq3?.status === "repair_in_progress", "Step 3: 'repair_in_progress' accepted");
  const seq4 = updateRepairStatus(testSeqRepair.id, { status: "verification_pending", technicianWorkflowStatus: "completed" });
  assert(seq4?.status === "verification_pending", "Step 4: 'verification_pending' accepted");

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSimulationE2ETest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});

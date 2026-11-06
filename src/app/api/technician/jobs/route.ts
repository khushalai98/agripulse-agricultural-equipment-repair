import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/server";
import {
  getServerJobAssignments,
  setServerJobAssignment,
  updateServerRepair,
  getServerRepairs,
} from "@/services/serverRepairStore";

const serverJobAssignments = getServerJobAssignments();

async function verifyTechnicianRole(): Promise<{ ok: boolean; response?: NextResponse; tokenRole?: string; userId?: string; technicianName?: string }> {
  const auth = await getAuthenticatedProfile();
  if (!auth) {
    return { ok: false, response: NextResponse.json({ success: false, error: "unauthorized", messageHi: "कृपया पहले लॉगिन करें।" }, { status: 401 }) };
  }
  if (auth.profile.role !== "technician") {
    return { ok: false, response: NextResponse.json({ success: false, error: "forbidden", messageHi: "यह सुविधा केवल अधिकृत टेक्नीशियन खातों के लिए है।" }, { status: 403 }) };
  }
  return { ok: true, tokenRole: "technician", userId: auth.user.id, technicianName: auth.profile.full_name || auth.user.email || "प्रमाणित मिस्त्री" };
}

export async function GET(req: NextRequest) {
  const auth = await verifyTechnicianRole();
  if (!auth.ok) return auth.response!;

  return NextResponse.json({
    success: true,
    role: "technician",
    authorized: true,
    messageHi: "टेक्नीशियन कार्य सफलतापूर्वक लोड हुए।",
    activeAssignments: serverJobAssignments,
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyTechnicianRole();
  if (!auth.ok) return auth.response!;

  try {
    const body = await req.json();
    const { action, repairId, reason, parts, tools, messageToFarmer, notes, finalCost } = body;
    const technicianId = auth.userId!;
    const technicianName = auth.technicianName!;

    if (!repairId) {
      return NextResponse.json(
        { success: false, error: "missing_repair_id", messageHi: "मरम्मत अनुरोध आईडी आवश्यक है।" },
        { status: 400 }
      );
    }

    const currentAssignment = serverJobAssignments[repairId];

    if (action === "accept") {
      // Concurrency check: prevent two technicians from accepting the same request
      if (currentAssignment && currentAssignment.technicianId && currentAssignment.technicianId !== technicianId) {
        return NextResponse.json(
          {
            success: false,
            error: "already_assigned",
            messageHi: "यह अनुरोध अन्य मैकेनिक द्वारा पहले ही स्वीकार कर लिया गया है।",
            assignedTo: currentAssignment.technicianName,
          },
          { status: 409 }
        );
      }

      serverJobAssignments[repairId] = {
        technicianId: technicianId || "tech-current",
        technicianName: technicianName || "प्रमाणित मिस्त्री",
        status: "technician_assigned",
        statusTextHi: "मैकेनिक नियुक्त हो गया है",
        updatedAt: new Date().toISOString(),
      };

      updateServerRepair(repairId, {
        status: "technician_assigned",
        statusTextHi: "मैकेनिक नियुक्त हो गया है",
        technicianId: technicianId || "tech-current",
      });

      return NextResponse.json({
        success: true,
        action: "accept",
        repairId,
        status: "technician_assigned",
        statusTextHi: "मैकेनिक नियुक्त हो गया है",
        assignment: serverJobAssignments[repairId],
        messageHi: "अनुरोध सफलतापूर्वक स्वीकार किया गया।",
      });
    }

    if (action === "reject") {
      const existingRejected = currentAssignment?.rejectedBy || [];
      if (technicianId && !existingRejected.includes(technicianId)) {
        existingRejected.push(technicianId);
      }

      serverJobAssignments[repairId] = {
        ...(currentAssignment || { technicianId: "", technicianName: "", status: "finding_mechanic", statusTextHi: "मैकेनिक खोज रहे हैं", updatedAt: new Date().toISOString() }),
        rejectionReason: reason || "उपलब्ध नहीं",
        rejectedBy: existingRejected,
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        action: "reject",
        repairId,
        rejectionReason: reason || "उपलब्ध नहीं",
        messageHi: "अनुरोध अस्वीकार दर्ज किया गया।",
      });
    }

    if (action === "update_parts") {
      if (currentAssignment) {
        currentAssignment.parts = parts || currentAssignment.parts;
        currentAssignment.tools = tools || currentAssignment.tools;
        currentAssignment.messageToFarmer = messageToFarmer || currentAssignment.messageToFarmer;
        currentAssignment.updatedAt = new Date().toISOString();
      }
      return NextResponse.json({
        success: true,
        action: "update_parts",
        repairId,
        parts: parts || [],
        tools: tools || [],
        messageToFarmer,
        messageHi: "आवश्यक सामान व सूचना सुरक्षित की गई।",
      });
    }

    if (action === "start_travel") {
      if (currentAssignment) {
        currentAssignment.status = "on_the_way";
        currentAssignment.statusTextHi = "मैकेनिक रास्ते में है";
        currentAssignment.updatedAt = new Date().toISOString();
      }
      updateServerRepair(repairId, {
        status: "on_the_way",
        statusTextHi: "मैकेनिक रास्ते में है",
      });
      return NextResponse.json({
        success: true,
        action: "start_travel",
        repairId,
        status: "on_the_way",
        statusTextHi: "मैकेनिक रास्ते में है",
        messageHi: "यात्रा शुरू की गई। किसान को सूचना भेजी गई।",
      });
    }

    if (action === "contact_farmer") {
      if (currentAssignment) {
        (currentAssignment as any).farmerContactedAt = new Date().toISOString();
        currentAssignment.updatedAt = new Date().toISOString();
      }
      return NextResponse.json({
        success: true,
        action: "contact_farmer",
        repairId,
        messageHi: "किसान से संपर्क दर्ज किया गया।",
      });
    }

    if (action === "arrived") {
      if (currentAssignment) {
        currentAssignment.status = "arrived";
        currentAssignment.statusTextHi = "मैकेनिक मौके पर पहुँच गया है";
        currentAssignment.updatedAt = new Date().toISOString();
      }
      updateServerRepair(repairId, {
        status: "arrived",
        statusTextHi: "मैकेनिक मौके पर पहुँच गया है",
      });
      return NextResponse.json({
        success: true,
        action: "arrived",
        repairId,
        status: "arrived",
        statusTextHi: "मैकेनिक मौके पर पहुँच गया है",
        messageHi: "मौके पर पहुँचने की पुष्टि की गई।",
      });
    }

    if (action === "start_repair") {
      if (currentAssignment) {
        currentAssignment.status = "repairing";
        currentAssignment.statusTextHi = "मरम्मत चल रही है";
        currentAssignment.updatedAt = new Date().toISOString();
      }
      updateServerRepair(repairId, {
        status: "repairing",
        statusTextHi: "मरम्मत चल रही है",
      });
      return NextResponse.json({
        success: true,
        action: "start_repair",
        repairId,
        status: "repairing",
        statusTextHi: "मरम्मत चल रही है",
        messageHi: "मरम्मत कार्य प्रारंभ किया गया।",
      });
    }

    if (action === "complete") {
      if (currentAssignment) {
        currentAssignment.status = "verification_pending";
        currentAssignment.statusTextHi = "मशीन की जाँच बाकी है";
        currentAssignment.notes = notes;
        currentAssignment.updatedAt = new Date().toISOString();
      }
      updateServerRepair(repairId, {
        status: "verification_pending",
        statusTextHi: "मशीन की जाँच बाकी है",
      });
      return NextResponse.json({
        success: true,
        action: "complete",
        repairId,
        status: "verification_pending",
        statusTextHi: "मशीन की जाँच बाकी है",
        finalCost,
        messageHi: "मरम्मत पूर्ण चिह्नित की गई। किसान सत्यापन लंबित।",
      });
    }

    return NextResponse.json(
      { success: false, error: "invalid_action", messageHi: "अमान्य कार्य।" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "server_error", messageHi: "अनुरोध प्रक्रिया में त्रुटि आई।" },
      { status: 500 }
    );
  }
}
